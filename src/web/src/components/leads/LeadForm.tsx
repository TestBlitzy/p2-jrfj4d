import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // ^7.0.0
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { 
  SecureFormWrapper, 
  SecureInput, 
  SecureButton 
} from '@security/components'; // ^2.0.0
import { Lead, LeadStatus } from '../../types/lead.types';
import { validateLeadForm, sanitizeInput } from '../../validators/lead.validator';
import { leadService } from '../../services/lead.service';
import { useAnalytics } from '../../hooks/useAnalytics';

// Constants for form validation and security
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const MAX_COMPANY_LENGTH = 100;
const SCORE_UPDATE_INTERVAL = 2000;

interface LeadFormProps {
  initialData?: Partial<Lead>;
  onSubmit: (lead: Lead) => void;
  onCancel: () => void;
  isEdit?: boolean;
  csrfToken: string;
  validationRules?: Record<string, any>;
  accessibilityProps?: Record<string, any>;
}

const LeadForm: React.FC<LeadFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEdit = false,
  csrfToken,
  validationRules,
  accessibilityProps
}) => {
  // Hooks initialization
  const { t } = useTranslation('leads');
  const { trackFormInteraction } = useAnalytics('lead_form', '24h');
  
  // Form state management
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    setValue,
    trigger
  } = useForm<Lead>({
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      company: initialData?.company || '',
      status: initialData?.status || LeadStatus.NEW,
      score: initialData?.score || 0
    },
    mode: 'onChange'
  });

  // Local state
  const [aiScore, setAiScore] = useState<number>(initialData?.score || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Watch form values for AI scoring
  const watchedValues = watch();

  // AI scoring effect
  useEffect(() => {
    const updateScore = async () => {
      if (!isDirty) return;

      try {
        const score = await leadService.getAIScore({
          firstName: watchedValues.firstName,
          lastName: watchedValues.lastName,
          email: watchedValues.email,
          company: watchedValues.company
        });
        setAiScore(score.data);
        setValue('score', score.data, { shouldValidate: true });
      } catch (error) {
        console.error('AI Scoring Error:', error);
      }
    };

    const debounceTimer = setTimeout(updateScore, SCORE_UPDATE_INTERVAL);
    return () => clearTimeout(debounceTimer);
  }, [watchedValues, isDirty, setValue]);

  // Form submission handler
  const onFormSubmit = useCallback(async (formData: Lead) => {
    setIsProcessing(true);
    setSecurityError(null);

    try {
      // Security validation
      const sanitizedData = {
        ...formData,
        firstName: sanitizeInput(formData.firstName),
        lastName: sanitizeInput(formData.lastName),
        email: sanitizeInput(formData.email),
        company: sanitizeInput(formData.company)
      };

      // Validate form data
      const validationErrors = validateLeadForm(sanitizedData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Track form submission
      trackFormInteraction('submit', {
        isEdit,
        leadId: formData.id,
        score: aiScore
      });

      // Submit to appropriate service
      const response = isEdit
        ? await leadService.updateLead(formData.id!, sanitizedData)
        : await leadService.createLead(sanitizedData);

      if (response.success) {
        onSubmit(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'Form submission failed');
      trackFormInteraction('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  }, [isEdit, onSubmit, trackFormInteraction, aiScore]);

  return (
    <SecureFormWrapper
      onSubmit={handleSubmit(onFormSubmit)}
      csrfToken={csrfToken}
      {...accessibilityProps}
      aria-label={t('form.aria_label')}
    >
      <div className="lead-form-grid">
        {/* First Name Field */}
        <Controller
          name="firstName"
          control={control}
          rules={{
            required: t('validation.firstName.required'),
            minLength: {
              value: MIN_NAME_LENGTH,
              message: t('validation.firstName.minLength', { length: MIN_NAME_LENGTH })
            },
            maxLength: {
              value: MAX_NAME_LENGTH,
              message: t('validation.firstName.maxLength', { length: MAX_NAME_LENGTH })
            },
            ...validationRules?.firstName
          }}
          render={({ field }) => (
            <SecureInput
              {...field}
              type="text"
              label={t('form.firstName.label')}
              error={errors.firstName?.message}
              aria-invalid={!!errors.firstName}
              aria-describedby="firstName-error"
              data-testid="lead-form-firstName"
            />
          )}
        />

        {/* Last Name Field */}
        <Controller
          name="lastName"
          control={control}
          rules={{
            required: t('validation.lastName.required'),
            minLength: {
              value: MIN_NAME_LENGTH,
              message: t('validation.lastName.minLength', { length: MIN_NAME_LENGTH })
            },
            maxLength: {
              value: MAX_NAME_LENGTH,
              message: t('validation.lastName.maxLength', { length: MAX_NAME_LENGTH })
            },
            ...validationRules?.lastName
          }}
          render={({ field }) => (
            <SecureInput
              {...field}
              type="text"
              label={t('form.lastName.label')}
              error={errors.lastName?.message}
              aria-invalid={!!errors.lastName}
              aria-describedby="lastName-error"
              data-testid="lead-form-lastName"
            />
          )}
        />

        {/* Email Field */}
        <Controller
          name="email"
          control={control}
          rules={{
            required: t('validation.email.required'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: t('validation.email.invalid')
            },
            ...validationRules?.email
          }}
          render={({ field }) => (
            <SecureInput
              {...field}
              type="email"
              label={t('form.email.label')}
              error={errors.email?.message}
              aria-invalid={!!errors.email}
              aria-describedby="email-error"
              data-testid="lead-form-email"
            />
          )}
        />

        {/* Company Field */}
        <Controller
          name="company"
          control={control}
          rules={{
            required: t('validation.company.required'),
            maxLength: {
              value: MAX_COMPANY_LENGTH,
              message: t('validation.company.maxLength', { length: MAX_COMPANY_LENGTH })
            },
            ...validationRules?.company
          }}
          render={({ field }) => (
            <SecureInput
              {...field}
              type="text"
              label={t('form.company.label')}
              error={errors.company?.message}
              aria-invalid={!!errors.company}
              aria-describedby="company-error"
              data-testid="lead-form-company"
            />
          )}
        />

        {/* AI Score Display */}
        <div className="ai-score-container" aria-live="polite">
          <label>{t('form.aiScore.label')}</label>
          <div className="score-value" data-testid="lead-form-score">
            {aiScore}
          </div>
          <div className="score-description">
            {t(`form.aiScore.description.${aiScore >= 70 ? 'high' : aiScore >= 40 ? 'medium' : 'low'}`)}
          </div>
        </div>

        {/* Error Display */}
        {securityError && (
          <div 
            className="error-message" 
            role="alert"
            aria-live="assertive"
            data-testid="lead-form-error"
          >
            {securityError}
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <SecureButton
            type="submit"
            disabled={isSubmitting || isProcessing}
            aria-busy={isSubmitting || isProcessing}
            data-testid="lead-form-submit"
          >
            {isSubmitting || isProcessing
              ? t('form.buttons.processing')
              : t(`form.buttons.${isEdit ? 'update' : 'create'}`)}
          </SecureButton>
          <SecureButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting || isProcessing}
            data-testid="lead-form-cancel"
          >
            {t('form.buttons.cancel')}
          </SecureButton>
        </div>
      </div>
    </SecureFormWrapper>
  );
};

export default React.memo(LeadForm);