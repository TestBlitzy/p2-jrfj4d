"""
Lead Scoring Predictor Module
Version: 1.0.0

A production-ready implementation of lead scoring prediction with GPU acceleration,
caching, and comprehensive monitoring capabilities.
"""

# tensorflow v2.14.0 - Deep learning framework with GPU support
import tensorflow as tf
# numpy v1.23.5 - Numerical operations for data processing
import numpy as np
# pandas v2.0.0 - Data manipulation and batch processing
import pandas as pd
# cachetools v5.3.0 - Prediction caching management
from cachetools import TTLCache

# Internal imports
from .model import LeadScoringModel
from ...utils.ai.utils import preprocessLeadData

# Global constants
DEFAULT_CONFIDENCE_THRESHOLD = 0.8
BATCH_SIZE = 32
MAX_RETRIES = 2
CACHE_TTL = 3600  # Cache TTL in seconds
GPU_MEMORY_LIMIT = 0.8  # GPU memory allocation limit

class LeadScoringPredictor:
    """
    Enhanced predictor class for generating lead scores and explanations using
    GPU-accelerated TensorFlow model with caching and monitoring.
    """
    
    def __init__(self, model_path: str, confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
                 gpu_config: dict = None):
        """
        Initialize predictor with model configuration, GPU setup, and caching.
        
        Args:
            model_path: Path to trained model artifacts
            confidence_threshold: Minimum confidence threshold for predictions
            gpu_config: GPU configuration parameters
        """
        # Configure GPU settings
        self.gpu_device = None
        if tf.config.list_physical_devices('GPU'):
            try:
                self.gpu_device = tf.config.list_physical_devices('GPU')[0]
                tf.config.experimental.set_memory_growth(self.gpu_device, True)
                tf.config.experimental.set_virtual_device_configuration(
                    self.gpu_device,
                    [tf.config.experimental.VirtualDeviceConfiguration(
                        memory_limit=int(GPU_MEMORY_LIMIT * 1024)
                    )]
                )
            except RuntimeError as e:
                print(f"GPU configuration error: {e}")
        
        # Initialize cache
        self.cache_manager = TTLCache(maxsize=10000, ttl=CACHE_TTL)
        
        # Initialize model
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.model = LeadScoringModel({})
        
        # Load model
        if not self.model.load_model(model_path):
            raise RuntimeError("Failed to load lead scoring model")
        
        # Initialize monitoring metrics
        self.metrics = {
            'predictions': 0,
            'cache_hits': 0,
            'avg_inference_time': 0,
            'errors': 0
        }

    def predict_single(self, lead_data: dict) -> dict:
        """
        Generates cached score prediction for a single lead with error handling.
        
        Args:
            lead_data: Dictionary containing lead features
            
        Returns:
            Dictionary containing prediction results and metadata
        """
        try:
            # Check cache
            cache_key = hash(str(lead_data))
            if cache_key in self.cache_manager:
                self.metrics['cache_hits'] += 1
                return self.cache_manager[cache_key]
            
            # Preprocess data
            processed_data = preprocessLeadData(lead_data)
            
            # Generate prediction with retries
            for attempt in range(MAX_RETRIES):
                try:
                    with tf.device('/GPU:0' if self.gpu_device else '/CPU:0'):
                        prediction = self.model.predict(processed_data['features'])
                    break
                except Exception as e:
                    if attempt == MAX_RETRIES - 1:
                        raise e
                    continue
            
            # Format result
            result = {
                'score': float(prediction['score']),
                'confidence': float(prediction['confidence']),
                'feature_importance': prediction['feature_importance'],
                'metadata': {
                    'model_version': self.model.model_version,
                    'cache_status': 'miss',
                    'gpu_utilized': bool(self.gpu_device),
                    'inference_time': prediction['metadata']['inference_time']
                }
            }
            
            # Cache result if confidence meets threshold
            if result['confidence'] >= self.confidence_threshold:
                self.cache_manager[cache_key] = result
            
            # Update metrics
            self.metrics['predictions'] += 1
            self._update_metrics(result['metadata']['inference_time'])
            
            return result
            
        except Exception as e:
            self.metrics['errors'] += 1
            raise RuntimeError(f"Prediction failed: {str(e)}")

    def predict_batch(self, leads_data: pd.DataFrame) -> pd.DataFrame:
        """
        Generates optimized batch predictions with parallel processing.
        
        Args:
            leads_data: DataFrame containing multiple leads' features
            
        Returns:
            DataFrame containing batch prediction results
        """
        try:
            results = []
            
            # Process in batches
            for i in range(0, len(leads_data), BATCH_SIZE):
                batch = leads_data.iloc[i:i + BATCH_SIZE]
                
                # Preprocess batch
                processed_batch = pd.DataFrame([
                    preprocessLeadData(lead)['features']
                    for _, lead in batch.iterrows()
                ])
                
                # Generate predictions
                with tf.device('/GPU:0' if self.gpu_device else '/CPU:0'):
                    batch_predictions = self.model.predict(processed_batch.values)
                
                # Format results
                for j, prediction in enumerate(batch_predictions):
                    results.append({
                        'lead_id': batch.index[j],
                        'score': float(prediction['score']),
                        'confidence': float(prediction['confidence']),
                        'feature_importance': prediction['feature_importance']
                    })
            
            return pd.DataFrame(results)
            
        except Exception as e:
            self.metrics['errors'] += 1
            raise RuntimeError(f"Batch prediction failed: {str(e)}")

    def explain_prediction(self, lead_data: dict) -> dict:
        """
        Generates detailed prediction explanations with feature importance.
        
        Args:
            lead_data: Dictionary containing lead features
            
        Returns:
            Dictionary containing feature importance and explanation
        """
        try:
            # Generate prediction first
            prediction = self.predict_single(lead_data)
            
            # Get feature importance
            feature_importance = prediction['feature_importance']
            
            # Generate explanation
            explanation = {
                'score': prediction['score'],
                'confidence': prediction['confidence'],
                'feature_importance': feature_importance,
                'key_factors': self._generate_key_factors(feature_importance),
                'recommendation': self._generate_recommendation(prediction['score'])
            }
            
            return explanation
            
        except Exception as e:
            self.metrics['errors'] += 1
            raise RuntimeError(f"Explanation generation failed: {str(e)}")

    def validate_model(self) -> dict:
        """
        Performs comprehensive model health and performance validation.
        
        Returns:
            Dictionary containing model health status and metrics
        """
        try:
            # Basic health checks
            health_status = {
                'model_loaded': bool(self.model),
                'gpu_available': bool(self.gpu_device),
                'cache_size': len(self.cache_manager),
                'metrics': self.metrics
            }
            
            # Validate with test prediction
            test_data = {'test': True}  # Minimal test data
            try:
                self.predict_single(test_data)
                health_status['prediction_test'] = 'passed'
            except Exception as e:
                health_status['prediction_test'] = f'failed: {str(e)}'
            
            return health_status
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def _update_metrics(self, inference_time: float):
        """Updates running metrics with new prediction data."""
        self.metrics['avg_inference_time'] = (
            (self.metrics['avg_inference_time'] * self.metrics['predictions'] + inference_time) /
            (self.metrics['predictions'] + 1)
        )

    def _generate_key_factors(self, feature_importance: dict) -> list:
        """Generates list of key factors influencing the prediction."""
        return [
            {'feature': feature, 'importance': score}
            for feature, score in sorted(
                feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]
        ]

    def _generate_recommendation(self, score: float) -> str:
        """Generates action recommendation based on lead score."""
        if score >= 0.8:
            return "Immediate sales team engagement recommended"
        elif score >= 0.5:
            return "Continue nurturing with increased engagement"
        else:
            return "Additional qualification needed"