import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconButton,
  Switch,
  TextField,
  Button,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Box
} from '@mui/material';
import {
  NotificationsActive,
  Edit,
  Delete,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import Card from '../common/Card';
import {
  PriceAlert,
  AlertCondition,
  AlertStatus
} from '../../types/market.types';

interface PriceAlertsProps {
  alerts?: PriceAlert[];
  onAddAlert?: (alert: Omit<PriceAlert, 'id'>) => Promise<void>;
  onEditAlert?: (id: string, alert: Partial<PriceAlert>) => Promise<void>;
  onDeleteAlert?: (id: string) => Promise<void>;
  onToggleAlert?: (id: string, isActive: boolean) => Promise<void>;
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({
  alerts = [],
  onAddAlert,
  onEditAlert,
  onDeleteAlert,
  onToggleAlert
}) => {
  // State management
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Form state
  const [formData, setFormData] = useState({
    competitorProductId: '',
    condition: AlertCondition.ABOVE,
    threshold: 0,
    isActive: true
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for performance optimization
  const alertSubscriptions = useRef(new Map());

  // Handlers
  const handleOpenDialog = useCallback(() => {
    setEditingAlert(null);
    setFormData({
      competitorProductId: '',
      condition: AlertCondition.ABOVE,
      threshold: 0,
      isActive: true
    });
    setErrors({});
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingAlert(null);
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.competitorProductId) {
      newErrors.competitorProductId = 'Product is required';
    }
    if (formData.threshold <= 0) {
      newErrors.threshold = 'Threshold must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingAlert) {
        await onEditAlert?.(editingAlert.id, formData);
        setSnackbar({
          open: true,
          message: 'Price alert updated successfully',
          severity: 'success'
        });
      } else {
        await onAddAlert?.(formData);
        setSnackbar({
          open: true,
          message: 'Price alert created successfully',
          severity: 'success'
        });
      }
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save price alert',
        severity: 'error'
      });
    }
  }, [formData, editingAlert, onAddAlert, onEditAlert, validateForm, handleCloseDialog]);

  const handleEdit = useCallback((alert: PriceAlert) => {
    setEditingAlert(alert);
    setFormData({
      competitorProductId: alert.competitorProductId,
      condition: alert.condition,
      threshold: alert.threshold,
      isActive: alert.isActive
    });
    setOpenDialog(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await onDeleteAlert?.(id);
      setSnackbar({
        open: true,
        message: 'Price alert deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete price alert',
        severity: 'error'
      });
    }
  }, [onDeleteAlert]);

  const handleToggle = useCallback(async (id: string, isActive: boolean) => {
    try {
      await onToggleAlert?.(id, isActive);
      setSnackbar({
        open: true,
        message: `Price alert ${isActive ? 'activated' : 'deactivated'} successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to toggle price alert',
        severity: 'error'
      });
    }
  }, [onToggleAlert]);

  // Render alert card
  const renderAlertCard = useCallback((alert: PriceAlert) => (
    <Card
      key={alert.id}
      variant="outlined"
      className="price-alert-card"
      testId={`price-alert-${alert.id}`}
      header={
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Price Alert {alert.isActive && (
              <NotificationsActive color="primary" fontSize="small" />
            )}
          </Typography>
          <Box>
            <Tooltip title="Edit Alert">
              <IconButton
                onClick={() => handleEdit(alert)}
                size="small"
                aria-label="edit alert"
              >
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Alert">
              <IconButton
                onClick={() => handleDelete(alert.id)}
                size="small"
                aria-label="delete alert"
                color="error"
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      }
    >
      <Box display="flex" flexDirection="column" gap={2}>
        <Typography>
          Alert when price is {alert.condition.toLowerCase()} ${alert.threshold}
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Switch
            checked={alert.isActive}
            onChange={(e) => handleToggle(alert.id, e.target.checked)}
            aria-label="toggle alert"
          />
          <Typography variant="caption" color="textSecondary">
            Last updated: {new Date(alert.lastUpdated).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
    </Card>
  ), [handleEdit, handleDelete, handleToggle]);

  return (
    <div className="price-alerts-container">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Price Alerts</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          startIcon={<NotificationsActive />}
        >
          Add Alert
        </Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        {alerts.map(renderAlertCard)}
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingAlert ? 'Edit Price Alert' : 'Create Price Alert'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3} mt={2}>
              <FormControl fullWidth error={!!errors.competitorProductId}>
                <TextField
                  label="Product"
                  value={formData.competitorProductId}
                  onChange={(e) => setFormData({
                    ...formData,
                    competitorProductId: e.target.value
                  })}
                  error={!!errors.competitorProductId}
                  helperText={errors.competitorProductId}
                  required
                />
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: e.target.value as AlertCondition
                  })}
                  label="Condition"
                >
                  {Object.values(AlertCondition).map((condition) => (
                    <MenuItem key={condition} value={condition}>
                      {condition.toLowerCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth error={!!errors.threshold}>
                <TextField
                  label="Threshold"
                  type="number"
                  value={formData.threshold}
                  onChange={(e) => setFormData({
                    ...formData,
                    threshold: Number(e.target.value)
                  })}
                  error={!!errors.threshold}
                  helperText={errors.threshold}
                  required
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingAlert ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PriceAlerts;