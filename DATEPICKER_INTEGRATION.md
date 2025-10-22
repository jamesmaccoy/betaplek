# DatePicker Integration with Payload CMS Forms

This document explains how the shadcn Calendar component has been integrated with Payload CMS forms using the form builder plugin.

## Overview

The DatePicker component has been successfully integrated into the Payload CMS form system, allowing users to create forms with date range selection capabilities using the shadcn Calendar component.

## Components Added

### 1. DatePicker Form Field Component
- **Location**: `src/blocks/Form/DatePicker/index.tsx`
- **Features**:
  - Date range selection using react-day-picker
  - Configurable maximum days limit
  - Form validation integration
  - Responsive design with popover interface
  - Integration with react-hook-form

### 2. DatePicker Configuration
- **Location**: `src/blocks/Form/DatePicker/config.ts`
- **Fields**:
  - `name`: Field name
  - `label`: Display label
  - `width`: Field width percentage
  - `maxDays`: Maximum number of days for date range
  - `required`: Whether the field is required

## Integration Steps Completed

### 1. Added DatePicker to Form Fields
Updated `src/blocks/Form/fields.tsx` to include the DatePicker component in the fields export.

### 2. Updated Payload Types
Modified `src/payload-types.ts` to include the `datePicker` block type in the Form interface with the following properties:
- `name`: string
- `label`: string | null
- `width`: number | null
- `maxDays`: number | null
- `required`: boolean | null

### 3. Updated Form Builder Plugin Configuration
Modified `src/plugins/index.ts` to include the datePicker field in the formBuilderPlugin configuration.

### 4. Created Test Form and Page
- **Test Form**: `src/endpoints/seed/test-form-with-datepicker.ts`
- **Test Page**: `src/endpoints/seed/test-page-with-datepicker.ts`
- **Integration**: Updated main seed file to include test form and page

## Usage

### Creating a Form with DatePicker

1. In the Payload CMS admin, go to Forms
2. Create a new form
3. Add a field with block type "Date Picker"
4. Configure the field:
   - Set the field name
   - Set the label
   - Set the width (percentage)
   - Set maximum days for the date range
   - Mark as required if needed

### Form Field Configuration Options

- **Name**: The field name used in form submissions
- **Label**: The display label for the field
- **Width**: Field width as a percentage (1-100)
- **Max Days**: Maximum number of days allowed in the date range
- **Required**: Whether the field must be filled

### Example Form Structure

```typescript
{
  name: 'event-date',
  blockName: 'event-date',
  blockType: 'datePicker',
  label: 'Event Date',
  required: true,
  width: 100,
  maxDays: 30,
}
```

## Features

### Date Range Selection
- Users can select a start and end date
- Visual calendar interface with month navigation
- Two-month view for better date range selection

### Validation
- Required field validation
- Maximum days validation (if configured)
- Form integration with react-hook-form

### Responsive Design
- Mobile-friendly popover interface
- Responsive calendar layout
- Touch-friendly date selection

### Styling
- Consistent with shadcn design system
- Dark/light mode support
- Customizable through Tailwind classes

## Dependencies

The DatePicker component uses the following dependencies (already installed):
- `react-day-picker`: ^8.10.1
- `date-fns`: ^4.1.0
- `@radix-ui/react-popover`: ^1.1.4
- `lucide-react`: ^0.378.0

## Testing

A test form and page have been created to demonstrate the DatePicker integration:
- **Test Form**: Includes name, email, date picker, and message fields
- **Test Page**: Accessible at `/test-datepicker` (after seeding)
- **Features**: Shows date range selection with 30-day maximum limit

## Future Enhancements

Potential improvements that could be added:
1. Single date selection mode
2. Date restrictions (min/max dates)
3. Custom date formatting
4. Time selection integration
5. Recurring date patterns

## Troubleshooting

### Common Issues

1. **DatePicker not appearing in form builder**: Ensure the component is properly exported in `fields.tsx`
2. **Validation errors**: Check that the field name matches the form configuration
3. **Styling issues**: Verify that all required UI components are installed
4. **Type errors**: Run `npm run generate:types` to update Payload types

### Debug Steps

1. Check browser console for errors
2. Verify form field configuration in Payload admin
3. Ensure all dependencies are installed
4. Check that the DatePicker component is properly imported

## Conclusion

The DatePicker integration provides a powerful and user-friendly way to collect date range information in Payload CMS forms. The component is fully integrated with the form builder system and provides a consistent user experience across the application.
