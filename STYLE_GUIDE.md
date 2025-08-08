# Matrix Vista Style Guide

## Overview
This style guide documents the design system for the Matrix Vista application, featuring the modern MATRIX, VISTA, and NOVA tab structure with professional branding.

## Brand Colors

### Primary Brand Colors
- **Brand Primary**: `#1a365d` - Deep professional blue
- **Brand Secondary**: `#2d3748` - Charcoal grey
- **Brand Accent**: `#3182ce` - Modern blue accent
- **Brand Light**: `#edf2f7` - Light background

### Tab-Specific Themes

#### MATRIX (Core) - Purple Theme
- **Primary**: `#6a1b9a` - Matrix purple/violet
- **Secondary**: `#4a148c` - Darker matrix purple
- **Light**: `#f3e5f5` - Light matrix purple
- **Gradient**: `linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)`

#### VISTA (Analytics) - Blue Theme
- **Primary**: `#2196f3` - Vista blue
- **Secondary**: `#1976d2` - Darker vista blue
- **Light**: `#e3f2fd` - Light vista blue
- **Gradient**: `linear-gradient(135deg, #2196f3 0%, #1976d2 100%)`

#### NOVA (Projections) - Orange Theme
- **Primary**: `#ff9800` - Nova orange
- **Secondary**: `#f57c00` - Darker nova orange
- **Light**: `#fff3e0` - Light nova orange
- **Gradient**: `linear-gradient(135deg, #ff9800 0%, #f57c00 100%)`

## Typography

### Font Family
- **Primary**: Inter (modern geometric sans-serif)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

### Font Sizes
- **xs**: 0.75rem (12px)
- **sm**: 0.875rem (14px)
- **base**: 1rem (16px)
- **lg**: 1.125rem (18px)
- **xl**: 1.25rem (20px)
- **2xl**: 1.5rem (24px)
- **3xl**: 1.875rem (30px)
- **4xl**: 2.25rem (36px)
- **5xl**: 3rem (48px)

### Font Weights
- **Light**: 300
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700
- **Extrabold**: 800

## Spacing System

Uses a consistent spacing scale based on 0.25rem (4px) increments:

- **1**: 0.25rem (4px)
- **2**: 0.5rem (8px)
- **3**: 0.75rem (12px)
- **4**: 1rem (16px)
- **5**: 1.25rem (20px)
- **6**: 1.5rem (24px)
- **8**: 2rem (32px)
- **10**: 2.5rem (40px)
- **12**: 3rem (48px)
- **16**: 4rem (64px)
- **20**: 5rem (80px)
- **24**: 6rem (96px)
- **32**: 8rem (128px)

## Border Radius

- **sm**: 0.25rem (4px)
- **base**: 0.5rem (8px)
- **md**: 0.75rem (12px)
- **lg**: 1rem (16px)
- **xl**: 1.5rem (24px)
- **2xl**: 2rem (32px)
- **full**: 9999px (circular)

## Shadows

- **xs**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **sm**: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`
- **base**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **md**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- **lg**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
- **xl**: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`

## Component Design Patterns

### Tab Navigation
- Modern pill-style tabs with individual branding
- Smooth hover transitions with subtle elevation
- Active states use brand gradients and animations
- Clear visual hierarchy with icons and labels

### Cards and Panels
- Generous use of whitespace
- Subtle shadows for depth
- Rounded corners for modern feel
- Consistent padding and margins

### Interactive Elements
- Hover states with subtle animations
- Focus states for accessibility
- Smooth transitions (250ms ease-in-out)
- Color-coded buttons for different actions

### Information Banners
- Theme-specific background gradients
- Left border accent in brand colors
- Clear typography hierarchy
- Appropriate icon usage

## Layout Principles

### Visual Hierarchy
1. **Primary**: Main MATRIX brand in header
2. **Secondary**: VISTA and NOVA as sub-brands in tabs
3. **Tertiary**: Content sections and components

### Spacing
- Consistent use of spacing scale
- Ample whitespace for readability
- Proper content grouping
- Responsive considerations

### Modern Design Elements
- Gradient backgrounds
- Subtle animations and micro-interactions
- Clean geometric shapes
- Professional color palette
- High contrast for accessibility

## Responsive Design

### Breakpoints
- **Mobile**: < 480px
- **Tablet**: 480px - 768px
- **Desktop**: 768px - 1024px
- **Large Desktop**: > 1024px

### Mobile Adaptations
- Stacked tab layout
- Increased touch targets (44px minimum)
- Simplified navigation
- Optimized spacing for smaller screens

## Accessibility

### Color Contrast
- All text meets WCAG AA standards
- Focus indicators are clearly visible
- Color is not the only means of conveying information

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order
- Clear focus indicators
- Proper ARIA labels and roles

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Descriptive labels and alt text
- Status announcements for dynamic content

## Usage Guidelines

### Do's
- Use consistent spacing from the scale
- Apply brand colors appropriately to their respective sections
- Maintain visual hierarchy
- Use the Inter font family
- Implement smooth transitions
- Follow accessibility guidelines

### Don'ts
- Mix brand colors inappropriately
- Use inconsistent spacing
- Ignore hover and focus states
- Create overly complex layouts
- Sacrifice accessibility for aesthetics
- Use colors without sufficient contrast

## Future Enhancements

### Planned Improvements
- Dark mode support
- Enhanced animations
- Additional micro-interactions
- Extended color palette
- Component library expansion

### Extensibility
The design system is built to be easily extendable for future tabs and components while maintaining consistency with the established patterns.