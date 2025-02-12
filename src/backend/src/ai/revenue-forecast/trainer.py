# External imports with version specifications
import numpy as np  # v1.24.x
import pandas as pd  # v2.0.x
from sklearn.model_selection import train_test_split  # v1.3.x
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import logging
import os
import json
import time
import psutil
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Internal imports
from .model import RevenueForecastModel

# Global training configuration
TRAINING_CONFIG = {
    'validation_split': 0.2,
    'test_split': 0.1,
    'random_state': 42,
    'min_training_samples': 365,
    'early_stopping_patience': 10,
    'model_checkpoint_path': './checkpoints',
    'log_dir': './logs',
    'max_training_time': 3600,
    'resource_monitoring_interval': 60,
    'data_drift_threshold': 0.1,
    'validation_metrics': ['mse', 'mae', 'r2', 'mape'],
    'anomaly_detection_threshold': 3.0
}

class RevenueForecastTrainer:
    """
    Enterprise-grade training pipeline manager for revenue forecasting model with
    comprehensive monitoring, validation, and error handling.
    """
    
    def __init__(self, config: Dict = TRAINING_CONFIG) -> None:
        """
        Initialize the trainer with comprehensive configuration and monitoring setup.
        
        Args:
            config (Dict): Training configuration parameters
        """
        # Setup enterprise logging
        self.logger = self._setup_logging()
        self.logger.info("Initializing RevenueForecastTrainer")
        
        # Initialize configuration and components
        self.config = self._validate_config(config)
        self.model = RevenueForecastModel()
        self.metrics_tracker = {}
        self.resource_monitor = {
            'cpu_usage': [],
            'memory_usage': [],
            'training_time': []
        }
        
        # Create required directories
        self._setup_directories()
        
        self.logger.info("Trainer initialization completed successfully")

    def _setup_logging(self) -> logging.Logger:
        """Configure enterprise-grade logging with detailed formatting."""
        logger = logging.getLogger(f"revenue_forecast_trainer_{datetime.now().strftime('%Y%m%d')}")
        logger.setLevel(logging.INFO)
        
        # Create formatters and handlers
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # File handler
        log_file = os.path.join(TRAINING_CONFIG['log_dir'], 'revenue_forecast_training.log')
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        return logger

    def _validate_config(self, config: Dict) -> Dict:
        """Validate training configuration parameters."""
        required_keys = [
            'validation_split', 'test_split', 'min_training_samples',
            'early_stopping_patience', 'validation_metrics'
        ]
        
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required configuration key: {key}")
        
        return config

    def _setup_directories(self) -> None:
        """Create and validate required directories with proper permissions."""
        directories = [
            self.config['model_checkpoint_path'],
            self.config['log_dir']
        ]
        
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory, mode=0o755, exist_ok=True)
                self.logger.info(f"Created directory: {directory}")

    def prepare_data(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Comprehensive data preparation with validation and preprocessing.
        
        Args:
            data (pd.DataFrame): Input revenue data
            
        Returns:
            Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]: Training, validation, and test datasets
        """
        self.logger.info("Starting data preparation")
        
        try:
            # Validate input data
            if len(data) < self.config['min_training_samples']:
                raise ValueError(
                    f"Insufficient data points. Required: {self.config['min_training_samples']}, "
                    f"Provided: {len(data)}"
                )
            
            # Check for data quality
            self._validate_data_quality(data)
            
            # Handle missing values
            data = self._handle_missing_values(data)
            
            # Detect and handle outliers
            data = self._handle_outliers(data)
            
            # Split data ensuring temporal consistency
            train_data, temp_data = train_test_split(
                data,
                test_size=self.config['validation_split'] + self.config['test_split'],
                shuffle=False
            )
            
            val_size = self.config['validation_split'] / (
                self.config['validation_split'] + self.config['test_split']
            )
            
            val_data, test_data = train_test_split(
                temp_data,
                test_size=1-val_size,
                shuffle=False
            )
            
            # Validate split distributions
            self._validate_split_distribution(train_data, val_data, test_data)
            
            self.logger.info("Data preparation completed successfully")
            return train_data, val_data, test_data
            
        except Exception as e:
            self.logger.error(f"Error in data preparation: {str(e)}")
            raise

    def train_model(self, training_data: pd.DataFrame) -> Dict:
        """
        Executes model training with comprehensive monitoring and validation.
        
        Args:
            training_data (pd.DataFrame): Prepared training data
            
        Returns:
            Dict: Detailed training history and metrics
        """
        self.logger.info("Starting model training")
        start_time = time.time()
        
        try:
            # Prepare data splits
            train_data, val_data, test_data = self.prepare_data(training_data)
            
            # Start resource monitoring
            self._start_resource_monitoring()
            
            # Train model
            training_history = self.model.train(train_data, val_data)
            
            # Evaluate on test set
            test_metrics = self.evaluate_model(test_data)
            
            # Stop resource monitoring
            self._stop_resource_monitoring()
            
            # Calculate training duration
            training_duration = time.time() - start_time
            
            # Compile training results
            training_results = {
                'training_history': training_history,
                'test_metrics': test_metrics,
                'training_duration': training_duration,
                'resource_usage': self.resource_monitor,
                'model_version': self.model.model_version,
                'timestamp': datetime.now().isoformat()
            }
            
            # Log training results
            self._log_training_results(training_results)
            
            self.logger.info("Model training completed successfully")
            return training_results
            
        except Exception as e:
            self.logger.error(f"Error in model training: {str(e)}")
            raise

    def evaluate_model(self, test_data: pd.DataFrame) -> Dict:
        """
        Comprehensive model evaluation with detailed metrics and validation.
        
        Args:
            test_data (pd.DataFrame): Test dataset
            
        Returns:
            Dict: Comprehensive evaluation metrics
        """
        self.logger.info("Starting model evaluation")
        
        try:
            # Generate predictions
            predictions = self.model.predict(test_data, forecast_horizon=1)
            
            # Calculate metrics
            metrics = {}
            for metric in self.config['validation_metrics']:
                if metric == 'mse':
                    metrics['mse'] = mean_squared_error(
                        test_data.values,
                        predictions['predictions']
                    )
                elif metric == 'mae':
                    metrics['mae'] = mean_absolute_error(
                        test_data.values,
                        predictions['predictions']
                    )
                elif metric == 'r2':
                    metrics['r2'] = r2_score(
                        test_data.values,
                        predictions['predictions']
                    )
                elif metric == 'mape':
                    metrics['mape'] = self._calculate_mape(
                        test_data.values,
                        predictions['predictions']
                    )
            
            # Add confidence interval coverage
            metrics['ci_coverage'] = self._calculate_ci_coverage(
                test_data.values,
                predictions['confidence_intervals']
            )
            
            self.logger.info("Model evaluation completed successfully")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error in model evaluation: {str(e)}")
            raise

    def save_trained_model(self, save_path: str) -> bool:
        """
        Secure model saving with comprehensive artifact management.
        
        Args:
            save_path (str): Path to save model artifacts
            
        Returns:
            bool: Save operation success status
        """
        self.logger.info(f"Saving model artifacts to {save_path}")
        
        try:
            # Validate save path
            if not os.path.exists(save_path):
                os.makedirs(save_path, mode=0o755, exist_ok=True)
            
            # Save model
            self.model.save(save_path)
            
            # Save training configuration
            config_path = os.path.join(save_path, 'training_config.json')
            with open(config_path, 'w') as f:
                json.dump(self.config, f)
            
            # Save metrics
            metrics_path = os.path.join(save_path, 'training_metrics.json')
            with open(metrics_path, 'w') as f:
                json.dump(self.metrics_tracker, f)
            
            self.logger.info("Model artifacts saved successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving model artifacts: {str(e)}")
            return False

    def _validate_data_quality(self, data: pd.DataFrame) -> None:
        """Validate data quality and completeness."""
        # Check for required columns
        required_columns = ['revenue']
        missing_columns = [col for col in required_columns if col not in data.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Check for data types
        if not pd.api.types.is_numeric_dtype(data['revenue']):
            raise ValueError("Revenue column must be numeric")
        
        # Check for index continuity
        if not data.index.is_monotonic_increasing:
            raise ValueError("Data index must be monotonically increasing")

    def _handle_missing_values(self, data: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values with appropriate strategies."""
        # Interpolate missing values
        data = data.interpolate(method='time')
        
        # Forward fill any remaining gaps
        data = data.ffill()
        
        # Backward fill any remaining gaps at the beginning
        data = data.bfill()
        
        return data

    def _handle_outliers(self, data: pd.DataFrame) -> pd.DataFrame:
        """Detect and handle outliers using robust statistical methods."""
        Q1 = data['revenue'].quantile(0.25)
        Q3 = data['revenue'].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - 3 * IQR
        upper_bound = Q3 + 3 * IQR
        
        # Cap outliers instead of removing them
        data.loc[data['revenue'] < lower_bound, 'revenue'] = lower_bound
        data.loc[data['revenue'] > upper_bound, 'revenue'] = upper_bound
        
        return data

    def _validate_split_distribution(
        self,
        train_data: pd.DataFrame,
        val_data: pd.DataFrame,
        test_data: pd.DataFrame
    ) -> None:
        """Validate the distribution of data splits."""
        # Calculate basic statistics for each split
        train_stats = train_data['revenue'].describe()
        val_stats = val_data['revenue'].describe()
        test_stats = test_data['revenue'].describe()
        
        # Check for significant distribution differences
        for metric in ['mean', 'std']:
            train_val_diff = abs(train_stats[metric] - val_stats[metric]) / train_stats[metric]
            train_test_diff = abs(train_stats[metric] - test_stats[metric]) / train_stats[metric]
            
            if train_val_diff > self.config['data_drift_threshold']:
                self.logger.warning(f"Significant {metric} difference between train and validation sets")
            
            if train_test_diff > self.config['data_drift_threshold']:
                self.logger.warning(f"Significant {metric} difference between train and test sets")

    def _start_resource_monitoring(self) -> None:
        """Start monitoring system resources during training."""
        self.resource_monitor['start_time'] = time.time()
        self.resource_monitor['cpu_usage'] = []
        self.resource_monitor['memory_usage'] = []

    def _stop_resource_monitoring(self) -> None:
        """Stop resource monitoring and calculate statistics."""
        self.resource_monitor['end_time'] = time.time()
        self.resource_monitor['duration'] = (
            self.resource_monitor['end_time'] - self.resource_monitor['start_time']
        )
        
        # Calculate resource usage statistics
        self.resource_monitor['cpu_usage_avg'] = np.mean(self.resource_monitor['cpu_usage'])
        self.resource_monitor['memory_usage_avg'] = np.mean(self.resource_monitor['memory_usage'])

    def _calculate_mape(self, actual: np.ndarray, predicted: np.ndarray) -> float:
        """Calculate Mean Absolute Percentage Error."""
        return np.mean(np.abs((actual - predicted) / actual)) * 100

    def _calculate_ci_coverage(
        self,
        actual: np.ndarray,
        confidence_intervals: Dict
    ) -> float:
        """Calculate confidence interval coverage."""
        within_ci = np.logical_and(
            actual >= confidence_intervals['lower'],
            actual <= confidence_intervals['upper']
        )
        return np.mean(within_ci) * 100

    def _log_training_results(self, results: Dict) -> None:
        """Log detailed training results and metrics."""
        log_file = os.path.join(
            self.config['log_dir'],
            f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
        with open(log_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        self.logger.info(f"Training results saved to {log_file}")