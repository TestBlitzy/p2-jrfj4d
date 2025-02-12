"""
Lead Scoring Model Implementation
Version: 1.0.0

A production-ready TensorFlow-based lead scoring model with GPU acceleration,
feature importance analysis, and comprehensive monitoring capabilities.
"""

# tensorflow v2.14.0 - Deep learning framework with GPU support
import tensorflow as tf
# numpy v1.23.5 - Numerical operations and data processing
import numpy as np
# scikit-learn v1.3.0 - Model evaluation and preprocessing
from sklearn.metrics import roc_auc_score, precision_recall_curve
from sklearn.preprocessing import StandardScaler

# Internal imports
from ...utils.ai.utils import preprocessLeadData

# Global constants
DEFAULT_CONFIDENCE_THRESHOLD = 0.8
MODEL_VERSION = '1.0.0'
CACHE_EXPIRY = 3600  # Cache expiry in seconds
GPU_MEMORY_LIMIT = 0.8  # GPU memory allocation limit
MIN_PREDICTION_CONFIDENCE = 0.6

class LeadScoringModel:
    """
    Enhanced lead scoring model implementing GPU-accelerated neural network
    with advanced feature importance analysis and monitoring capabilities.
    """
    
    def __init__(self, config: dict):
        """
        Initialize the lead scoring model with enhanced configuration and GPU support.
        
        Args:
            config (dict): Model configuration parameters
        """
        # Configure GPU settings
        self._configure_gpu()
        
        # Initialize model configuration
        self.model_config = config
        self.model_version = MODEL_VERSION
        self.confidence_threshold = config.get('confidence_threshold', DEFAULT_CONFIDENCE_THRESHOLD)
        
        # Initialize feature columns and preprocessing
        self.feature_columns = config.get('feature_columns', {})
        self.scaler = StandardScaler()
        
        # Setup caching system
        self.cache = {}
        
        # Initialize performance metrics
        self.performance_metrics = {
            'predictions': 0,
            'cache_hits': 0,
            'avg_inference_time': 0,
            'gpu_utilization': 0
        }
        
        # Initialize feature importance tracking
        self.feature_importance_scores = {}
        
        # Build model architecture
        self.model = self.build_model()

    def _configure_gpu(self):
        """Configure GPU settings for optimal performance."""
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            try:
                # Limit GPU memory growth
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                    tf.config.experimental.set_virtual_device_configuration(
                        gpu,
                        [tf.config.experimental.VirtualDeviceConfiguration(
                            memory_limit=int(GPU_MEMORY_LIMIT * 1024)
                        )]
                    )
            except RuntimeError as e:
                print(f"GPU configuration error: {e}")

    def build_model(self) -> tf.keras.Model:
        """
        Construct the GPU-optimized neural network architecture.
        
        Returns:
            tf.keras.Model: Compiled TensorFlow model
        """
        with tf.device('/GPU:0'):
            # Input layer
            inputs = tf.keras.layers.Input(shape=(len(self.feature_columns),))
            
            # Hidden layers with advanced architecture
            x = tf.keras.layers.Dense(
                128,
                activation='relu',
                kernel_regularizer=tf.keras.regularizers.l2(0.01)
            )(inputs)
            x = tf.keras.layers.BatchNormalization()(x)
            x = tf.keras.layers.Dropout(0.3)(x)
            
            x = tf.keras.layers.Dense(
                64,
                activation='relu',
                kernel_regularizer=tf.keras.regularizers.l2(0.01)
            )(x)
            x = tf.keras.layers.BatchNormalization()(x)
            x = tf.keras.layers.Dropout(0.2)(x)
            
            # Output layer with calibrated sigmoid
            outputs = tf.keras.layers.Dense(1, activation='sigmoid')(x)
            
            # Create model
            model = tf.keras.Model(inputs=inputs, outputs=outputs)
            
            # Compile with optimized settings
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                loss='binary_crossentropy',
                metrics=['accuracy', tf.keras.metrics.AUC()]
            )
            
            return model

    def predict(self, input_data: np.ndarray) -> dict:
        """
        Generate lead score prediction with confidence analysis.
        
        Args:
            input_data (np.ndarray): Preprocessed input features
            
        Returns:
            dict: Prediction results with score and confidence metrics
        """
        # Check cache first
        cache_key = hash(input_data.tobytes())
        if cache_key in self.cache:
            self.performance_metrics['cache_hits'] += 1
            return self.cache[cache_key]
        
        # Preprocess input data
        processed_data = preprocessLeadData(input_data)
        scaled_data = self.scaler.transform(processed_data['features'])
        
        # Generate prediction
        start_time = tf.timestamp()
        with tf.device('/GPU:0'):
            prediction = self.model.predict(scaled_data, verbose=0)
        inference_time = tf.timestamp() - start_time
        
        # Calculate confidence score
        confidence_score = self._calculate_prediction_confidence(prediction)
        
        # Calculate feature importance
        feature_importance = self.get_feature_importance(scaled_data)
        
        # Prepare result
        result = {
            'score': float(prediction[0][0]),
            'confidence': float(confidence_score),
            'feature_importance': feature_importance,
            'metadata': {
                'model_version': self.model_version,
                'inference_time': float(inference_time),
                'gpu_utilized': bool(tf.config.list_physical_devices('GPU'))
            }
        }
        
        # Update cache and metrics
        self.cache[cache_key] = result
        self._update_performance_metrics(inference_time)
        
        return result

    def save_model(self, save_path: str) -> bool:
        """
        Save model with comprehensive metadata and versioning.
        
        Args:
            save_path (str): Path to save model artifacts
            
        Returns:
            bool: Success status
        """
        try:
            # Save model architecture and weights
            self.model.save(f"{save_path}/model", save_format='tf')
            
            # Save additional metadata
            metadata = {
                'version': self.model_version,
                'feature_columns': self.feature_columns,
                'performance_metrics': self.performance_metrics,
                'feature_importance': self.feature_importance_scores,
                'config': self.model_config
            }
            
            np.save(f"{save_path}/metadata.npy", metadata)
            return True
        except Exception as e:
            print(f"Model save error: {e}")
            return False

    def load_model(self, model_path: str) -> bool:
        """
        Load model with validation and GPU optimization.
        
        Args:
            model_path (str): Path to model artifacts
            
        Returns:
            bool: Success status
        """
        try:
            # Load model with GPU optimization
            with tf.device('/GPU:0'):
                self.model = tf.keras.models.load_model(f"{model_path}/model")
            
            # Load metadata
            metadata = np.load(f"{model_path}/metadata.npy", allow_pickle=True).item()
            
            # Restore model state
            self.model_version = metadata['version']
            self.feature_columns = metadata['feature_columns']
            self.performance_metrics = metadata['performance_metrics']
            self.feature_importance_scores = metadata['feature_importance']
            self.model_config = metadata['config']
            
            return True
        except Exception as e:
            print(f"Model load error: {e}")
            return False

    def get_feature_importance(self, input_data: np.ndarray) -> dict:
        """
        Calculate detailed feature importance metrics.
        
        Args:
            input_data (np.ndarray): Input features for importance analysis
            
        Returns:
            dict: Feature importance scores and rankings
        """
        with tf.GradientTape() as tape:
            input_tensor = tf.convert_to_tensor(input_data, dtype=tf.float32)
            tape.watch(input_tensor)
            predictions = self.model(input_tensor)
            
        # Calculate gradients
        gradients = tape.gradient(predictions, input_tensor)
        importance_scores = tf.reduce_mean(tf.abs(gradients), axis=0)
        
        # Create feature importance dictionary
        feature_importance = {}
        for idx, feature in enumerate(self.feature_columns):
            feature_importance[feature] = float(importance_scores[idx])
        
        # Sort by importance
        sorted_importance = dict(sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return sorted_importance

    def _calculate_prediction_confidence(self, prediction: np.ndarray) -> float:
        """Calculate confidence score for prediction."""
        confidence = min(
            abs(prediction[0][0] - 0.5) * 2,
            self.confidence_threshold
        )
        return max(confidence, MIN_PREDICTION_CONFIDENCE)

    def _update_performance_metrics(self, inference_time: float):
        """Update model performance metrics."""
        self.performance_metrics['predictions'] += 1
        self.performance_metrics['avg_inference_time'] = (
            (self.performance_metrics['avg_inference_time'] * 
             (self.performance_metrics['predictions'] - 1) +
             inference_time) / self.performance_metrics['predictions']
        )
        
        # Update GPU utilization if available
        if tf.config.list_physical_devices('GPU'):
            self.performance_metrics['gpu_utilization'] = tf.config.experimental.get_memory_info('GPU:0')['current'] / (GPU_MEMORY_LIMIT * 1024)