# Translation Keys Documentation

This directory contains translation files organized by language and namespace.

## Directory Structure

```
locales/
├── en/              # English translations
│   ├── auth.json
│   ├── stories.json
│   ├── entities.json
│   └── onboarding.json
├── he/              # Hebrew translations
│   ├── auth.json
│   ├── stories.json
│   ├── entities.json
│   └── onboarding.json
└── README.md        # This file
```

## Translation Key Naming Conventions

### General Rules

1. **Namespaces**: Translations are organized by feature/namespace (auth, stories, entities, onboarding)
2. **Nested Structure**: Use nested objects to group related translations
3. **Descriptive Keys**: Use descriptive, hierarchical keys that reflect the UI structure
4. **Consistency**: Maintain consistent naming patterns across all namespaces

### Key Structure Patterns

#### Screen/Component Structure
```json
{
  "screenName": {
    "title": "Screen Title",
    "subtitle": "Screen Subtitle",
    "fields": {
      "fieldName": "Field Label",
      "fieldNamePlaceholder": "Placeholder text"
    },
    "buttons": {
      "buttonName": "Button Text"
    },
    "validation": {
      "fieldNameError": "Error message"
    }
  }
}
```

#### Common Patterns

- **Titles**: `screenName.title`, `componentName.title`
- **Labels**: `screenName.fields.fieldName`
- **Placeholders**: `screenName.fields.fieldNamePlaceholder`
- **Buttons**: `screenName.buttons.buttonName`
- **Validation Messages**: `screenName.validation.fieldNameError`
- **Empty States**: `screenName.emptyTitle`, `screenName.emptyMessage`
- **Success Messages**: `screenName.actionSuccess` (e.g., `deleted`, `created`)
- **Error Messages**: `screenName.actionFailed` (e.g., `deleteFailed`, `createFailed`)

### Namespace Organization

#### `auth.json`
- `login.*` - Login screen translations
- `signup.*` - Signup screen translations
- `forgotPassword.*` - Forgot password screen translations

#### `stories.json`
- `list.*` - Stories list screen
- `detail.*` - Story detail screen and tabs
- `create.*` - Create story form
- `edit.*` - Edit story form
- `delete.*` - Delete confirmation and messages

#### `entities.json`
- `characters.*` - Character-related translations
- `blurbs.*` - Blurb-related translations
- `scenes.*` - Scene-related translations
- `chapters.*` - Chapter-related translations
- `common.*` - Shared translations (roles, categories, validation)

#### `onboarding.json`
- `cards.*` - Onboarding card content
- `buttons.*` - Onboarding navigation buttons

## Usage Examples

### Basic Translation Key
```json
{
  "login": {
    "title": "Welcome Back"
  }
}
```
Usage: `t('auth:login.title')`

### Nested Translation Key
```json
{
  "signup": {
    "fields": {
      "email": "Email",
      "emailPlaceholder": "Enter your email"
    }
  }
}
```
Usage: `t('auth:signup.fields.email')`, `t('auth:signup.fields.emailPlaceholder')`

### Validation Messages
```json
{
  "signup": {
    "validation": {
      "emailRequired": "Email is required",
      "invalidEmail": "Please enter a valid email address"
    }
  }
}
```
Usage: `t('auth:signup.validation.emailRequired')`

## Best Practices

1. **Keep Keys Organized**: Group related translations together
2. **Use Descriptive Names**: Keys should clearly indicate their purpose
3. **Maintain Consistency**: Follow the same structure patterns across namespaces
4. **Avoid Duplication**: Use common/shared keys when translations are reused
5. **Keep Keys Flat Enough**: Don't nest too deeply (2-3 levels is usually sufficient)
6. **Document Context**: Add comments in code when translation keys are used

## Adding New Translations

1. Identify the appropriate namespace (auth, stories, entities, onboarding)
2. Add keys following the existing structure patterns
3. Add translations for all supported languages (en, he)
4. Update this documentation if introducing new patterns

## Language Codes

- `en` - English
- `he` - Hebrew (RTL support required)
