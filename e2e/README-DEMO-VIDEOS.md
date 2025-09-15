# ArchiComm Demo Video Generation System

This system automatically generates high-quality demo videos of ArchiComm features for marketing, documentation, and social media purposes.

## Quick Start

### Generate All Demo Videos
```bash
npm run generate:demo-videos
```

### Generate Specific Video
```bash
npm run generate:demo-video feature-overview
```

### List Available Videos
```bash
npm run demo:list
```

## Available Demo Videos

### 1. Feature Overview (90 seconds)
- **Purpose**: Quick marketing showcase
- **Platforms**: YouTube, Twitter, Website
- **Features**: Component palette, drag & drop, annotations, export
- **Includes**: Thumbnail, GIF preview

### 2. Complete Workflow (3 minutes)
- **Purpose**: Comprehensive demonstration
- **Platforms**: YouTube, LinkedIn, Website
- **Features**: Full design process from start to finish
- **Includes**: Thumbnail

### 3. Collaboration Demo
- **Purpose**: Team features showcase
- **Platforms**: YouTube, LinkedIn
- **Features**: Sharing, real-time editing, conflict resolution
- **Includes**: Thumbnail

### 4. Mobile Responsive
- **Purpose**: Mobile experience demonstration
- **Platforms**: Instagram, Twitter, Website
- **Features**: Touch interface, responsive design
- **Includes**: Thumbnail, GIF preview

### 5. Performance Showcase
- **Purpose**: Scalability demonstration
- **Platforms**: YouTube, LinkedIn, Website
- **Features**: Large-scale designs, smooth performance
- **Includes**: Thumbnail, performance metrics

## File Structure

```
e2e/
├── demo-videos/           # Raw recorded videos
├── processed-videos/      # Platform-optimized outputs
├── temp-videos/          # Temporary processing files
├── demo-video-recording.spec.ts   # Main test file
├── utils/
│   ├── video-helpers.ts          # Recording utilities
│   ├── video-processor.ts        # Post-processing
│   └── demo-scenarios.ts         # Pre-configured demos
└── scripts/
    └── generate-demo-videos.ts   # Generation script
```

## Output Formats

### Platform-Specific Optimizations

- **YouTube**: 1080p MP4, high quality (CRF 18)
- **Twitter**: 720p MP4, compressed (CRF 23)
- **LinkedIn**: 1080p MP4, high quality (CRF 18)
- **Instagram**: 1080p MP4 + GIF preview
- **Website**: 1080p WebM, web-optimized (CRF 28)

### Additional Assets

- **Thumbnails**: High-quality JPG captures at 3-second mark
- **GIF Previews**: 8-second looping GIFs for quick previews
- **Metadata**: JSON file with video information and specs

## Video Features

### Professional Presentation
- ✅ Smooth animations and transitions
- ✅ Professional cursor highlighting
- ✅ Click visualizations
- ✅ Annotation overlays
- ✅ Title cards and branding
- ✅ Consistent 1920x1080 recording

### Interactive Elements
- ✅ Highlighted UI components
- ✅ Smooth drag & drop demonstrations
- ✅ Real-time typing effects
- ✅ Performance metrics overlay
- ✅ Split-screen collaboration views

### Quality Controls
- ✅ High frame rate recording (30-60fps)
- ✅ Consistent font rendering
- ✅ Disabled animations for stability
- ✅ Professional color schemes
- ✅ No flicker or jitter

## Customization

### Creating New Demo Scenarios

1. Add scenario to `e2e/utils/demo-scenarios.ts`:

```typescript
export const demoScenarios = {
  myCustomDemo: {
    title: 'My Custom Demo',
    duration: 120000, // 2 minutes
    steps: [
      {
        type: 'title',
        text: 'My Demo Title',
        duration: 3000
      },
      {
        type: 'navigate',
        target: '/'
      },
      // ... more steps
    ]
  }
};
```

2. Add configuration to `e2e/scripts/generate-demo-videos.ts`:

```typescript
const videoConfigs: DemoVideoConfig[] = [
  {
    name: 'my-custom-demo',
    description: 'My custom demonstration',
    project: 'demo-videos',
    testPattern: 'My Custom Demo',
    platforms: ['youtube', 'website'],
    createThumbnail: true,
    createGif: false
  }
];
```

### Modifying Video Quality

Edit `VideoProcessingOptions` in video processor:

```typescript
// Ultra-high quality for presentations
{
  quality: 'ultra',
  format: 'mp4',
  compress: false,
  resolution: '4k',
  framerate: 60
}

// Lightweight for social media
{
  quality: 'web',
  format: 'webm',
  compress: true,
  resolution: '720p',
  framerate: 30
}
```

## Advanced Usage

### Manual Recording Only
```bash
npm run e2e:demo-videos                    # Desktop demos
npm run e2e:demo-videos-mobile            # Mobile demos
npm run e2e:demo-videos-collab            # Collaboration demos
```

### Processing Existing Videos
```typescript
import { createVideoProcessor } from './e2e/utils/video-processor';

const processor = createVideoProcessor();

// Optimize for specific platform
await processor.optimizeForPlatform('my-video.webm', 'youtube');

// Create GIF preview
await processor.createGifFromVideo('my-video.webm', 'preview');

// Generate thumbnail
await processor.createVideoThumbnail('my-video.webm');
```

### Batch Processing
```typescript
// Process all videos matching pattern
await processor.batchProcess('feature-', {
  quality: 'hd',
  format: 'mp4',
  compress: true
});
```

## Requirements

### Essential
- Node.js 18+
- Playwright installed (`npx playwright install`)
- Development server running (`npm run web:dev`)

### Optional (for video processing)
- FFmpeg installed (for format conversion and optimization)
- ImageMagick (for advanced image processing)

### FFmpeg Installation

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

## Troubleshooting

### Common Issues

**Videos not recording:**
- Ensure dev server is running: `npm run web:dev`
- Check Playwright browser installation: `npx playwright install`

**Processing fails:**
- Install FFmpeg for video processing
- Check file permissions in output directories

**Poor video quality:**
- Increase recording resolution in Playwright config
- Use 'ultra' quality setting for processing
- Ensure stable frame rate during recording

**Large file sizes:**
- Enable compression in processing options
- Use WebM format for web distribution
- Reduce resolution for social media platforms

### Debugging

**Enable verbose logging:**
```bash
DEBUG=pw:* npm run generate:demo-videos
```

**Test individual components:**
```bash
# Test recording only
npm run e2e:demo-videos --headed

# Test processing only
npx ts-node -e "
import { createVideoProcessor } from './e2e/utils/video-processor';
const p = createVideoProcessor();
p.processVideo('test.webm', 'output', { quality: 'hd', format: 'mp4', compress: true });
"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Generate Demo Videos

on:
  push:
    branches: [main]
    paths: ['src/**', 'e2e/demo-video-recording.spec.ts']

jobs:
  demo-videos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps
          sudo apt-get install ffmpeg

      - name: Start dev server
        run: npm run web:dev &

      - name: Generate demo videos
        run: npm run generate:demo-videos

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: demo-videos
          path: e2e/processed-videos/
```

## Best Practices

### Recording
1. **Stable Environment**: Use consistent browser settings and disable system notifications
2. **Smooth Interactions**: Add appropriate delays between actions for professional appearance
3. **Clear Annotations**: Use readable fonts and high contrast for overlay text
4. **Consistent Timing**: Maintain steady pace throughout demonstrations

### Processing
1. **Platform Optimization**: Use appropriate quality settings for each distribution platform
2. **File Size Management**: Balance quality with file size for web distribution
3. **Backup Originals**: Keep raw recordings for future re-processing
4. **Batch Processing**: Process multiple videos together for efficiency

### Distribution
1. **Version Control**: Track video versions alongside code changes
2. **Asset Organization**: Maintain clear naming conventions for easy identification
3. **Quality Assurance**: Review all outputs before distribution
4. **Platform Testing**: Verify videos play correctly on target platforms

---

This system enables automated, high-quality demo video generation that scales with your development workflow. Videos are automatically optimized for different platforms while maintaining professional presentation standards.