# External imports with version specifications
import numpy as np  # v1.24.x
import pandas as pd  # v2.0.x
import logging  # built-in
from tenacity import retry, stop_after_attempt, wait_exponential  # v8.0.x
import redis  # v4.5.x
from datetime import datetime
from typing import Dict, Optional, Union
import json
import os
from logging.handlers import RotatingFileHandler

# Internal imports
from .model import RevenueForecastModel

# Global configuration for revenue forecasting service
FORECAST_CONFIG = {
    'model_path': 'models/revenue_forecast',
    'forecast_horizon': 90,
    'confidence_interval': 0.95,
    'min_data_points': 365,
    'cache_ttl': 3600,
    'retry_attempts': 3,
    'batch_size': 1000,
    'log_level': 'INFO'
}

class RevenueForecastService:
    """
    Enterprise-grade revenue forecasting service with comprehensive error handling,
    caching, and monitoring capabilities.
    """

    def __init__(self, config: Dict = FORECAST_CONFIG):
        """
        Initialize the forecasting service with production configuration.

        Args:
            config (Dict): Service configuration parameters
        """
        # Set up production logging
        self.logger = self._initialize_logger()
        self.logger.info("Initializing RevenueForecastService")

        # Initialize configuration
        self.config = self._validate_config(config)
        
        # Initialize Redis cache
        self.cache = self._initialize_cache()
        
        # Initialize model
        try:
            self.model = RevenueForecastModel()
            self.model.load(self.config['model_path'])
            self._validate_model_health()
        except Exception as e:
            self.logger.error(f"Failed to initialize model: {str(e)}")
            raise

        self.logger.info("RevenueForecastService initialized successfully")

    def _initialize_logger(self) -> logging.Logger:
        """Configure production-grade rotating file logger."""
        logger = logging.getLogger("revenue_forecast_service")
        logger.setLevel(getattr(logging, self.config['log_level']))

        # Create logs directory if it doesn't exist
        os.makedirs("logs", exist_ok=True)

        # Configure rotating file handler
        handler = RotatingFileHandler(
            "logs/revenue_forecast_service.log",
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _initialize_cache(self) -> redis.Redis:
        """Initialize Redis cache connection with error handling."""
        try:
            cache = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                db=0,
                decode_responses=True
            )
            # Test connection
            cache.ping()
            return cache
        except redis.ConnectionError as e:
            self.logger.warning(f"Failed to initialize Redis cache: {str(e)}")
            return None

    def _validate_config(self, config: Dict) -> Dict:
        """Validate service configuration parameters."""
        required_keys = [
            'model_path', 'forecast_horizon', 'confidence_interval',
            'min_data_points', 'cache_ttl', 'retry_attempts'
        ]
        
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required configuration key: {key}")
        
        return config

    def _validate_model_health(self) -> None:
        """Verify model health and readiness."""
        try:
            health_status = self.model.validate_model_health()
            if not health_status['healthy']:
                raise RuntimeError(f"Model health check failed: {health_status['message']}")
        except Exception as e:
            self.logger.error(f"Model health validation failed: {str(e)}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def generate_forecast(
        self,
        historical_data: pd.DataFrame,
        forecast_horizon: Optional[int] = None
    ) -> Dict:
        """
        Generate revenue forecasts with confidence intervals and caching.

        Args:
            historical_data (pd.DataFrame): Historical revenue data
            forecast_horizon (Optional[int]): Number of periods to forecast

        Returns:
            Dict: Forecast results including predictions and confidence intervals
        """
        try:
            # Set forecast horizon
            horizon = forecast_horizon or self.config['forecast_horizon']
            
            # Generate cache key
            cache_key = f"forecast_{historical_data.index[-1]}_{horizon}"
            
            # Check cache
            if self.cache:
                cached_result = self.cache.get(cache_key)
                if cached_result:
                    self.logger.info("Returning cached forecast")
                    return json.loads(cached_result)

            # Validate input data
            if not self.validate_data(historical_data):
                raise ValueError("Input data validation failed")

            # Generate forecast
            forecast_result = self.model.predict(
                historical_data,
                horizon
            )

            # Format results
            formatted_result = self.format_forecast(forecast_result)

            # Cache results
            if self.cache:
                self.cache.setex(
                    cache_key,
                    self.config['cache_ttl'],
                    json.dumps(formatted_result)
                )

            self.logger.info("Forecast generated successfully")
            return formatted_result

        except Exception as e:
            self.logger.error(f"Error generating forecast: {str(e)}")
            raise

    def validate_data(self, data: pd.DataFrame) -> bool:
        """
        Validate input data for forecasting.

        Args:
            data (pd.DataFrame): Input data to validate

        Returns:
            bool: Validation result
        """
        try:
            # Check minimum data points
            if len(data) < self.config['min_data_points']:
                self.logger.error(
                    f"Insufficient data points. Required: {self.config['min_data_points']}, "
                    f"Provided: {len(data)}"
                )
                return False

            # Check for missing values
            if data.isnull().any().any():
                self.logger.error("Data contains missing values")
                return False

            # Check data types
            if not np.issubdtype(data.values.dtype, np.number):
                self.logger.error("Data contains non-numeric values")
                return False

            # Check for negative values
            if (data < 0).any().any():
                self.logger.error("Data contains negative values")
                return False

            return True

        except Exception as e:
            self.logger.error(f"Error in data validation: {str(e)}")
            return False

    def format_forecast(self, predictions: Dict) -> Dict:
        """
        Format forecast results with metadata.

        Args:
            predictions (Dict): Raw prediction results

        Returns:
            Dict: Formatted forecast with metadata
        """
        try:
            return {
                'forecast': {
                    'values': predictions['predictions'],
                    'confidence_intervals': predictions['confidence_intervals']
                },
                'metadata': {
                    'model_version': predictions['model_version'],
                    'generated_at': datetime.now().isoformat(),
                    'forecast_horizon': self.config['forecast_horizon'],
                    'confidence_level': self.config['confidence_interval']
                },
                'status': 'success'
            }
        except Exception as e:
            self.logger.error(f"Error formatting forecast: {str(e)}")
            raise

    def health_check(self) -> Dict:
        """
        Perform service health check.

        Returns:
            Dict: Health status and metrics
        """
        try:
            status = {
                'service': 'revenue_forecast',
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'checks': {
                    'model': self.model.validate_model_health(),
                    'cache': bool(self.cache and self.cache.ping()),
                }
            }
            
            # Set overall status based on component health
            if not all(status['checks'].values()):
                status['status'] = 'degraded'
            
            return status

        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")
            return {
                'service': 'revenue_forecast',
                'status': 'unhealthy',
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }