import { useState, type CSSProperties, type ChangeEvent } from 'react';
import { cn } from '../../lib/cn';
import type { FormField } from '../../types';
import { Eye, EyeOff, Star, Heart, ThumbsUp, UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

export interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  primaryColor?: string;
  textColor?: string;
  formId?: string;
}

export function FieldRenderer({ field, value, onChange, onFocus, error, disabled, primaryColor, textColor, formId }: FieldRendererProps): JSX.Element | null {
  const inputId = `field-${field.id}`;
  const describedBy = error ? `${inputId}-error` : field.helpText ? `${inputId}-help` : undefined;
  const accentStyle: CSSProperties | undefined = primaryColor ? { accentColor: primaryColor } : undefined;
  const labelStyle: CSSProperties | undefined = textColor ? { color: textColor } : undefined;
  const [passwordVisible, setPasswordVisible] = useState(false);

  const baseInput = cn(
    'block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors',
    'placeholder:text-gray-400 focus:outline-none focus:ring-2',
    error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'focus:border-brand-500 focus:ring-brand-500/20',
    disabled && 'bg-gray-50 cursor-not-allowed',
  );

  function renderInput(): JSX.Element | null {
    switch (field.type) {
      case 'TEXT_SHORT':
      case 'PASSWORD':
      case 'EMAIL':
      case 'PHONE':
        return (
          <div className="relative">
            <input
              id={inputId}
              type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : field.type === 'PASSWORD' && !passwordVisible ? 'password' : 'text'}
              value={(value as string) ?? ''}
              placeholder={field.placeholder ?? ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
              onFocus={onFocus}
              disabled={disabled}
              required={field.required}
              aria-describedby={describedBy}
              aria-invalid={!!error}
              maxLength={field.validation?.maxLength ?? (field.type === 'PASSWORD' ? 1024 : 500)}
              autoComplete={field.type === 'PASSWORD' ? 'current-password' : undefined}
              className={cn(baseInput, field.type === 'PASSWORD' && 'pr-10')}
            />
            {field.type === 'PASSWORD' && (
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                disabled={disabled}
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={passwordVisible}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
        );

      case 'TEXT_LONG':
        return (
          <textarea
            id={inputId}
            rows={4}
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            maxLength={field.validation?.maxLength ?? 5000}
            className={baseInput}
          />
        );

      case 'NUMBER':
        return (
          <input
            id={inputId}
            type="number"
            value={(value as number | undefined) ?? ''}
            placeholder={field.placeholder ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.step ?? (field.validation?.integerOnly ? 1 : 'any')}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={baseInput}
          />
        );

      case 'DATE':
        return (
          <input
            id={inputId}
            type="date"
            value={(value as string) ?? ''}
            min={field.validation?.minDate}
            max={field.validation?.maxDate}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={baseInput}
          />
        );

      case 'RADIO': {
        const choices = field.options?.choices ?? [];
        return (
          <div role="radiogroup" aria-labelledby={`${inputId}-label`} className="space-y-2">
            {choices.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name={inputId}
                  value={c.value}
                  checked={value === c.value}
                  onChange={() => onChange(c.value)}
                  onFocus={onFocus}
                  disabled={disabled}
                  style={accentStyle}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700" style={labelStyle}>{c.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'CHECKBOX': {
        const choices = field.options?.choices ?? [];
        const arrayValue = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-2">
            {choices.map((c) => {
              const checked = arrayValue.includes(c.value);
              return (
                <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    value={c.value}
                    checked={checked}
                    onChange={() => {
                      onChange(checked ? arrayValue.filter((v) => v !== c.value) : [...arrayValue, c.value]);
                    }}
                    onFocus={onFocus}
                    disabled={disabled}
                    style={accentStyle}
                    className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700" style={labelStyle}>{c.label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'DROPDOWN': {
        const choices = field.options?.choices ?? [];
        return (
          <select
            id={inputId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={baseInput}
          >
            <option value="">{field.placeholder ?? 'Select...'}</option>
            {choices.map((c) => (
              <option key={c.id} value={c.value}>{c.label}</option>
            ))}
          </select>
        );
      }

      case 'RATING': {
        const max = field.options?.ratingMax ?? 5;
        const type = field.options?.ratingType ?? 'stars';
        const current = (value as number) ?? 0;
        const Icon = type === 'hearts' ? Heart : type === 'thumbs' ? ThumbsUp : Star;
        return (
          <div role="radiogroup" aria-labelledby={`${inputId}-label`} className="flex items-center gap-1.5">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                onFocus={onFocus}
                disabled={disabled}
                aria-label={`Rate ${n} of ${max}`}
                aria-pressed={current === n}
                className="rounded p-1 transition-colors hover:bg-amber-50 focus:outline-none dark:hover:bg-amber-950/30 focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Icon
                  className={cn('h-7 w-7 transition-colors', n <= current ? 'fill-amber-400 text-amber-400' : 'text-gray-300')}
                />
              </button>
            ))}
          </div>
        );
      }

      case 'YES_NO': {
        return (
          <div role="radiogroup" className="flex gap-3">
            {[
              { label: 'Yes', val: true },
              { label: 'No', val: false },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange(opt.val)}
                onFocus={onFocus}
                disabled={disabled}
                aria-pressed={value === opt.val}
                className={cn(
                  'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  value === opt.val
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-transparent text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
                )}
                style={value === opt.val && primaryColor ? { borderColor: primaryColor, backgroundColor: `${primaryColor}14`, color: primaryColor } : labelStyle}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      case 'FILE_UPLOAD':
        return (
          <FileUploadInput
            field={field}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            disabled={disabled}
            error={error}
            formId={formId}
          />
        );

      case 'HEADING':
        return null;

      case 'DIVIDER':
        return null;

      default: {
        const _exhaustive: never = field.type;
        void _exhaustive;
        return null;
      }
    }
  }

  if (field.type === 'HEADING') {
    return (
      <div className="border-b border-gray-200 pb-2 pt-2">
        <h2 className="break-words text-lg font-semibold" style={primaryColor ? { color: primaryColor } : labelStyle}>{field.label}</h2>
        {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
      </div>
    );
  }

  if (field.type === 'DIVIDER') {
    return <hr className="my-2 border-gray-200" />;
  }

  return (
    <div className="space-y-2">
      <label id={`${inputId}-label`} htmlFor={inputId} className="block break-words text-sm font-medium text-gray-900" style={labelStyle}>
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {field.helpText && (
        <p id={`${inputId}-help`} className="text-xs text-gray-500">{field.helpText}</p>
      )}
      {renderInput()}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

interface FileValue {
  url?: string;
  publicId?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  [key: string]: unknown;
}

function FileUploadInput({
  field,
  value,
  onChange,
  onFocus,
  disabled,
  error,
  formId,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  onFocus?: () => void;
  disabled?: boolean;
  error?: string;
  formId?: string;
}): JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileVal =
    typeof value === 'object' && value !== null
      ? (value as FileValue)
      : typeof value === 'string' && value
      ? { url: value, filename: value.split('/').pop() }
      : null;

  const handleUpload = async (file: File) => {
    setUploadError(null);

    // Client validation for Cloudinary 10 MB limit
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setUploadError(`File exceeds maximum limit of 10 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB selected)`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      let uploadedValue: FileValue | null = null;

      // Primary Attempt: Direct Signed Upload to Cloudinary
      try {
        const sigEndpoint = formId ? `/public/forms/${formId}/upload-url` : `/files/upload-url`;
        const sigRes = await api.post<{ data: { uploadUrl: string; apiKey: string; timestamp: number; signature: string; folder: string; publicId: string; maxFileSize?: number } }>(
          sigEndpoint,
          {
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            formId: formId || 'preview',
          },
        );

        const { uploadUrl, apiKey, timestamp, signature, folder, publicId, maxFileSize } = sigRes.data.data;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', folder);
        formData.append('public_id', publicId.split('/').pop() || '');
        if (maxFileSize) formData.append('max_file_size', String(maxFileSize));

        const cldRes = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl, true);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error('Direct Cloudinary upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during direct Cloudinary upload'));
          xhr.send(formData);
        });

        uploadedValue = {
          url: cldRes.secure_url,
          publicId: cldRes.public_id,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        };
      } catch (directErr) {
        // Fallback Attempt: Express Multer Server Upload Route
        const formData = new FormData();
        formData.append('file', file);
        if (formId) formData.append('formId', formId);

        const uploadEndpoint = formId ? `/public/forms/${formId}/upload` : `/files/upload`;
        const fallbackRes = await api.post<{ data: FileValue }>(uploadEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        });

        uploadedValue = fallbackRes.data.data;
      }

      if (uploadedValue) {
        onChange(uploadedValue);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload file';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || uploading) return;
    const file = e.target.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  };

  if (fileVal && fileVal.url) {
    const isImage = fileVal.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileVal.filename || '');
    return (
      <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            {isImage ? (
              <img src={fileVal.url} alt={fileVal.filename || 'Uploaded image'} className="h-12 w-12 rounded-md object-cover border border-gray-200" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                <FileText className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">{fileVal.filename || 'Uploaded file'}</p>
              {fileVal.sizeBytes && (
                <p className="text-xs text-gray-500 dark:text-slate-400">{(fileVal.sizeBytes / 1024).toFixed(1)} KB</p>
              )}
              <a
                href={fileVal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-0.5 text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                View file ↗
              </a>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-red-600 dark:hover:bg-slate-700"
              aria-label="Remove file"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20' : 'border-gray-300 hover:border-brand-400 dark:border-slate-700',
          disabled && 'cursor-not-allowed bg-gray-50 opacity-60 dark:bg-slate-900',
          error && 'border-red-400',
        )}
      >
        <input
          id={`field-${field.id}`}
          type="file"
          onChange={onFileChange}
          onFocus={onFocus}
          disabled={disabled || uploading}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        {uploading ? (
          <div className="space-y-2 py-2">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Uploading to Cloudinary... {progress}%</p>
            <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
              <div className="h-full bg-brand-600 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="space-y-2 pointer-events-none">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                <span className="text-brand-600 font-semibold dark:text-brand-400">Click to upload</span> or drag & drop
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Images, PDFs, Documents up to 10 MB</p>
            </div>
          </div>
        )}
      </div>

      {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
    </div>
  );
}
