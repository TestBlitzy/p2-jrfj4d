"""
Lead Scoring Model Trainer
Version: 1.0.0

A production-ready trainer implementation for the lead scoring model with GPU optimization,
comprehensive evaluation metrics, and automated hyperparameter tuning capabilities.
"""

# tensorflow v2.14.0 - Deep learning framework with GPU acceleration
import tensorflow as tf
# numpy v1.23.5 - Numerical operations with memory-efficient implementations
import numpy as np
# scikit-learn v1.3.0 - Model evaluation metrics and cross-validation
from sklearn.metrics import roc_curve, auc, precision_recall_curve, confusion_matrix
from sklearn.model_selection import KFold
# pandas v2.0.0 - Data manipulation and preprocessing
import pandas as pd

# Internal imports
from .model import LeadScoringModel
from ...utils.ai.utils import preprocessLeadData

# Global constants
DEFAULT_TRAINING_CONFIG = {
    'batch_size': 32,
    'epochs': 100,
    'learning_rate': 0.001,
    'validation_split': 0.2,
    'early_stopping_patience': 10,
    'gpu_memory_growth': True,
    'mixed_precision': True,
    'gradient_clip_norm': 1.0
}

MIN_TRAINING_SAMPLES = 10000

class LeadScoringTrainer:
    """
    Advanced trainer class for lead scoring model with GPU optimization,
    comprehensive evaluation metrics, and automated hyperparameter tuning.
    """
    
    def __init__(self, config: dict, model_path: str, gpu_config: dict = None):
        """
        Initialize the trainer with GPU-optimized configuration and monitoring setup.
        
        Args:
            config (dict): Training configuration parameters
            model_path (str): Path for model saving/loading
            gpu_config (dict): GPU-specific configuration
        """
        # Configure GPU settings
        self._configure_gpu(gpu_config)
        
        # Initialize training configuration
        self.training_config = {**DEFAULT_TRAINING_CONFIG, **config}
        
        # Initialize hyperparameters
        self.hyperparameters = {
            'learning_rate': self.training_config['learning_rate'],
            'batch_size': self.training_config['batch_size'],
            'layer_sizes': [128, 64],
            'dropout_rates': [0.3, 0.2]
        }
        
        # Initialize model and paths
        self.model_save_path = model_path
        self.model = LeadScoringModel(self.training_config)
        
        # Initialize metrics tracking
        self.training_history = {}
        self.evaluation_metrics = {}
        self.feature_importance = {}
        
        # Setup training callbacks
        self.callbacks = self._setup_callbacks()

    def _configure_gpu(self, gpu_config: dict = None):
        """Configure GPU settings for optimal training performance."""
        if gpu_config is None:
            gpu_config = {}
            
        try:
            # Enable memory growth to prevent OOM issues
            gpus = tf.config.experimental.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(
                        gpu,
                        gpu_config.get('memory_growth', True)
                    )
                    
                # Enable mixed precision for better performance
                if gpu_config.get('mixed_precision', True):
                    tf.keras.mixed_precision.set_global_policy('mixed_float16')
                    
        except RuntimeError as e:
            print(f"GPU configuration error: {e}")

    def _setup_callbacks(self) -> list:
        """Setup training callbacks for monitoring and optimization."""
        callbacks = [
            # Early stopping to prevent overfitting
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=self.training_config['early_stopping_patience'],
                restore_best_weights=True
            ),
            
            # Model checkpointing
            tf.keras.callbacks.ModelCheckpoint(
                filepath=f"{self.model_save_path}/checkpoints/model",
                monitor='val_loss',
                save_best_only=True
            ),
            
            # Learning rate scheduling
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.00001
            ),
            
            # TensorBoard logging
            tf.keras.callbacks.TensorBoard(
                log_dir=f"{self.model_save_path}/logs",
                histogram_freq=1
            )
        ]
        
        return callbacks

    def prepare_training_data(self, historical_leads: pd.DataFrame) -> tuple:
        """
        Prepares and validates training data with comprehensive checks.
        
        Args:
            historical_leads (pd.DataFrame): Historical lead data
            
        Returns:
            tuple: Training, validation, and test datasets
        """
        # Validate minimum data requirement
        if len(historical_leads) < MIN_TRAINING_SAMPLES:
            raise ValueError(f"Insufficient training data. Required: {MIN_TRAINING_SAMPLES}")
            
        # Preprocess lead data
        processed_data = preprocessLeadData(historical_leads)
        features = processed_data['features']
        labels = processed_data.get('labels', None)
        
        if labels is None:
            raise ValueError("Labels not found in processed data")
            
        # Split data into train, validation, and test sets
        train_size = int(0.7 * len(features))
        val_size = int(0.15 * len(features))
        
        # Create TensorFlow datasets
        train_dataset = tf.data.Dataset.from_tensor_slices(
            (features[:train_size], labels[:train_size])
        ).shuffle(buffer_size=10000).batch(
            self.training_config['batch_size']
        ).prefetch(tf.data.AUTOTUNE)
        
        val_dataset = tf.data.Dataset.from_tensor_slices(
            (features[train_size:train_size+val_size],
             labels[train_size:train_size+val_size])
        ).batch(self.training_config['batch_size'])
        
        test_dataset = tf.data.Dataset.from_tensor_slices(
            (features[train_size+val_size:],
             labels[train_size+val_size:])
        ).batch(self.training_config['batch_size'])
        
        return train_dataset, val_dataset, test_dataset

    def train_model(self, train_dataset: tf.data.Dataset, val_dataset: tf.data.Dataset) -> tf.keras.callbacks.History:
        """
        Trains the model with GPU optimization and comprehensive monitoring.
        
        Args:
            train_dataset (tf.data.Dataset): Training dataset
            val_dataset (tf.data.Dataset): Validation dataset
            
        Returns:
            tf.keras.callbacks.History: Training history
        """
        try:
            # Configure training strategy
            strategy = tf.distribute.MirroredStrategy() if len(
                tf.config.list_physical_devices('GPU')
            ) > 1 else tf.distribute.get_strategy()
            
            with strategy.scope():
                # Train model with monitoring
                history = self.model.model.fit(
                    train_dataset,
                    epochs=self.training_config['epochs'],
                    validation_data=val_dataset,
                    callbacks=self.callbacks,
                    verbose=1
                )
                
                self.training_history = history.history
                return history
                
        except Exception as e:
            print(f"Training error: {e}")
            raise

    def evaluate_model(self, test_dataset: tf.data.Dataset) -> dict:
        """
        Comprehensive model evaluation with detailed metrics.
        
        Args:
            test_dataset (tf.data.Dataset): Test dataset
            
        Returns:
            dict: Detailed evaluation metrics and analysis
        """
        # Generate predictions
        predictions = self.model.model.predict(test_dataset)
        true_labels = np.concatenate([y for x, y in test_dataset])
        
        # Calculate ROC curve and AUC
        fpr, tpr, _ = roc_curve(true_labels, predictions)
        roc_auc = auc(fpr, tpr)
        
        # Calculate precision-recall curve
        precision, recall, _ = precision_recall_curve(true_labels, predictions)
        
        # Calculate confusion matrix
        cm = confusion_matrix(true_labels, predictions > 0.5)
        
        # Store evaluation metrics
        self.evaluation_metrics = {
            'roc_auc': float(roc_auc),
            'precision': precision.tolist(),
            'recall': recall.tolist(),
            'confusion_matrix': cm.tolist(),
            'accuracy': float(np.mean((predictions > 0.5) == true_labels))
        }
        
        return self.evaluation_metrics

    def tune_hyperparameters(self, train_dataset: tf.data.Dataset, val_dataset: tf.data.Dataset) -> dict:
        """
        Advanced hyperparameter optimization with cross-validation.
        
        Args:
            train_dataset (tf.data.Dataset): Training dataset
            val_dataset (tf.data.Dataset): Validation dataset
            
        Returns:
            dict: Optimal hyperparameters and tuning history
        """
        # Define hyperparameter search space
        param_grid = {
            'learning_rate': [0.1, 0.01, 0.001],
            'batch_size': [16, 32, 64],
            'layer_sizes': [[64, 32], [128, 64], [256, 128]],
            'dropout_rates': [[0.2, 0.1], [0.3, 0.2], [0.4, 0.3]]
        }
        
        best_params = {}
        best_val_loss = float('inf')
        
        # Perform grid search with cross-validation
        kf = KFold(n_splits=5, shuffle=True)
        
        for params in self._generate_param_combinations(param_grid):
            val_losses = []
            
            # Update model configuration
            self.hyperparameters.update(params)
            self.model = LeadScoringModel(self.training_config)
            
            # Cross-validation evaluation
            for train_idx, val_idx in kf.split(train_dataset):
                history = self.train_model(
                    train_dataset.take(train_idx),
                    val_dataset.take(val_idx)
                )
                val_losses.append(min(history.history['val_loss']))
            
            avg_val_loss = np.mean(val_losses)
            
            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                best_params = params
        
        # Update model with best parameters
        self.hyperparameters = best_params
        self.model = LeadScoringModel(self.training_config)
        
        return best_params

    def save_trained_model(self) -> bool:
        """
        Saves the trained model with comprehensive metadata.
        
        Returns:
            bool: Success status
        """
        try:
            # Save model and weights
            self.model.save_model(self.model_save_path)
            
            # Save training history and metrics
            np.save(
                f"{self.model_save_path}/training_history.npy",
                self.training_history
            )
            np.save(
                f"{self.model_save_path}/evaluation_metrics.npy",
                self.evaluation_metrics
            )
            
            # Save hyperparameters and configuration
            np.save(
                f"{self.model_save_path}/hyperparameters.npy",
                self.hyperparameters
            )
            
            return True
            
        except Exception as e:
            print(f"Model save error: {e}")
            return False

    def _generate_param_combinations(self, param_grid: dict) -> list:
        """Generate combinations of hyperparameters for grid search."""
        from itertools import product
        
        keys = param_grid.keys()
        values = param_grid.values()
        combinations = [
            dict(zip(keys, v)) for v in product(*values)
        ]
        
        return combinations