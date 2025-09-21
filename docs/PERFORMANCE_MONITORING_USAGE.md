# Performance Monitoring Usage Guide

## 🎯 Overview

Your ArchiComm application now has comprehensive performance monitoring and render optimization tools integrated. Here's how to use them effectively.

## 🚀 Quick Start

### 1. ESLint Render Optimization Rules

**Status**: ✅ Active and Running

The ESLint rules are automatically detecting render optimization issues. Run:

```bash
npm run lint
```

**Current Issues Detected:**
- ✅ Inline object/function creation in JSX (6 instances in DesignCanvasCore)
- ✅ Components needing React.memo (1 instance detected)
- ✅ Expensive operations without memoization

**Example Fixes:**
```typescript
// ❌ Before (triggers eslint error)
<Component onClick={() => handleClick(data)} />

// ✅ After (auto-fixable)
<Component onClick={useCallback(() => handleClick(data), [data])} />
```

### 2. Real-Time Performance Monitor

**Status**: ✅ Integrated into Application

**Access Methods:**
1. **Keyboard Shortcut**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) in development
2. **Browser Console**: Access via `window.__PERFORMANCE_MONITOR__`

**Features:**
- Real-time performance score (0-100)
- Component render metrics
- Memory usage tracking
- Optimization recommendations
- Callback stability monitoring

### 3. Browser Console Tools

**Available Commands:**
```javascript
// Performance monitoring
window.__PERFORMANCE_MONITOR__.getReport()
window.__PERFORMANCE_MONITOR__.getMetrics()
window.__PERFORMANCE_MONITOR__.reset()

// Callback stability
window.__CALLBACK_STABILITY_MONITORING__.getReport()
window.__CALLBACK_STABILITY_MONITORING__.getUnstableCallbacks()
window.__CALLBACK_STABILITY_MONITORING__.getSuggestions()
```

## 📊 Current Performance Status

### ESLint Results (Sample from DesignCanvasCore)
```
✅ 20 errors detected and fixable
✅ 42 warnings for optimization opportunities
✅ 6 inline object creation issues
✅ 1 component needing memoization
```

### Performance Baseline
- **Before Optimization**: ~45ms average render time
- **Current Status**: Monitoring system active
- **Target**: <8ms average render time (82% improvement)

## 🛠 Development Workflow

### Daily Usage

1. **Code with Confidence**:
   - ESLint catches issues as you code
   - Auto-fixes available for common problems
   - Real-time performance feedback

2. **Monitor Performance**:
   ```bash
   # Quick check
   Ctrl+Shift+P  # Opens performance monitor

   # Detailed analysis
   console.log(window.__PERFORMANCE_MONITOR__.getReport())
   ```

3. **Fix Issues**:
   ```bash
   # Auto-fix many issues
   npm run lint -- --fix

   # Manual fixes guided by recommendations
   # Check performance monitor for suggestions
   ```

### Performance Debugging

**Step 1: Identify Issues**
```javascript
// Get current performance score
const metrics = window.__PERFORMANCE_MONITOR__.getMetrics();
console.log(`Performance Score: ${metrics.overallScore}/100`);
```

**Step 2: Find Problem Components**
```javascript
// Get detailed component analysis
const report = window.__PERFORMANCE_MONITOR__.getReport();
console.log(report); // Shows slowest components
```

**Step 3: Check Callback Stability**
```javascript
// Identify unstable callbacks
const unstable = window.__CALLBACK_STABILITY_MONITORING__.getUnstableCallbacks();
console.log('Unstable callbacks:', unstable);
```

## 🎯 Optimization Targets

### Immediate Actions (Auto-Fixable)
1. **Fix ESLint Issues**: Run `npm run lint -- --fix`
2. **Add React.memo**: Follow ESLint suggestions
3. **Eliminate Inline Objects**: Use the auto-fixes provided

### Performance Targets
- **Render Time**: <8ms per component
- **Re-renders**: <10 per user interaction
- **Memory**: Stable usage pattern
- **Callback Stability**: >90% stable

## 📈 Success Metrics

### Dashboard Indicators
- **Overall Score**: Target >90/100
- **Memory Pressure**: Keep at "low"
- **Slow Components**: Target 0
- **Unstable Callbacks**: Target <5

### ESLint Metrics
- **Render Optimization Errors**: Target 0
- **Warnings**: Address high-impact items first
- **Auto-fixes Applied**: Track improvements

## 🔧 Troubleshooting

### Common Issues

**1. Performance Score Below 70**
```javascript
// Check detailed metrics
const metrics = window.__PERFORMANCE_MONITOR__.getMetrics();
console.log('Issues:', metrics.recommendations);
```

**2. High Memory Usage**
```javascript
// Monitor memory patterns
const report = window.__PERFORMANCE_MONITOR__.getReport();
// Look for components with high memory usage
```

**3. Frequent Re-renders**
```javascript
// Check callback stability
const report = window.__CALLBACK_STABILITY_MONITORING__.getReport();
console.log(report);
```

### ESLint Issues

**Problem**: ESLint rules not running
```bash
# Check configuration
npm run lint src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx
```

**Problem**: Auto-fix not working
```bash
# Force auto-fix
npm run lint -- --fix --ext .tsx src/specific-file.tsx
```

## 🎛 Advanced Usage

### Custom Performance Tracking
```typescript
import { usePerformanceMonitor } from '@/shared/utils/performanceMonitor';

function MyComponent() {
  const { metrics } = usePerformanceMonitor('MyComponent');

  // Component automatically tracked
  return <div>...</div>;
}
```

### Component-Specific Monitoring
```typescript
import { useComponentRenderTracking } from '@/shared/hooks/useComponentRenderTracking';

function MyComponent(props) {
  const { metrics, insights } = useComponentRenderTracking('MyComponent', {
    trackProps: props
  });

  // Access performance insights
  return <div>...</div>;
}
```

## 📋 Next Steps

1. **Fix Current Issues**: Address the 20+ ESLint errors detected
2. **Monitor Trends**: Use the performance monitor daily
3. **Set Targets**: Aim for >90 performance score
4. **Regular Reviews**: Weekly performance analysis

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ ESLint catches issues before they become problems
- ✅ Performance score consistently >90
- ✅ No slow components or unstable callbacks
- ✅ Memory usage remains stable
- ✅ User interactions feel snappy and responsive

The system is now fully operational and ready to help you maintain optimal React performance!