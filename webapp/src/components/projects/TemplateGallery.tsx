import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LabelingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  config: string;
  tags: string[];
}

const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', count: 24 },
  { id: 'computer-vision', name: 'Computer Vision', count: 8 },
  { id: 'nlp', name: 'Natural Language Processing', count: 6 },
  { id: 'audio', name: 'Audio & Speech', count: 4 },
  { id: 'video', name: 'Video', count: 3 },
  { id: 'time-series', name: 'Time Series', count: 2 },
  { id: 'conversational', name: 'Conversational AI', count: 1 },
];

const TEMPLATES: LabelingTemplate[] = [
  {
    id: 'image-classification',
    name: 'Image Classification',
    description: 'Classify images into predefined categories',
    category: 'computer-vision',
    thumbnail: 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=400&h=300&fit=crop',
    tags: ['images', 'classification'],
    config: '<View>\n  <Image name="image" value="$image"/>\n  <Choices name="choice" toName="image">\n    <Choice value="Cat"/>\n    <Choice value="Dog"/>\n  </Choices>\n</View>',
  },
  {
    id: 'object-detection',
    name: 'Object Detection',
    description: 'Draw bounding boxes around objects in images',
    category: 'computer-vision',
    thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop',
    tags: ['images', 'bounding box', 'detection'],
    config: '<View>\n  <Image name="image" value="$image"/>\n  <RectangleLabels name="label" toName="image">\n    <Label value="Person"/>\n    <Label value="Car"/>\n  </RectangleLabels>\n</View>',
  },
  {
    id: 'semantic-segmentation',
    name: 'Semantic Segmentation',
    description: 'Segment images by drawing polygons or masks',
    category: 'computer-vision',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop',
    tags: ['images', 'segmentation', 'polygon'],
    config: '<View>\n  <Image name="image" value="$image"/>\n  <PolygonLabels name="label" toName="image">\n    <Label value="Road"/>\n    <Label value="Building"/>\n  </PolygonLabels>\n</View>',
  },
  {
    id: 'text-classification',
    name: 'Text Classification',
    description: 'Classify text into categories',
    category: 'nlp',
    thumbnail: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=300&fit=crop',
    tags: ['text', 'classification'],
    config: '<View>\n  <Text name="text" value="$text"/>\n  <Choices name="sentiment" toName="text">\n    <Choice value="Positive"/>\n    <Choice value="Negative"/>\n    <Choice value="Neutral"/>\n  </Choices>\n</View>',
  },
  {
    id: 'named-entity-recognition',
    name: 'Named Entity Recognition',
    description: 'Label entities in text',
    category: 'nlp',
    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=300&fit=crop',
    tags: ['text', 'NER', 'entities'],
    config: '<View>\n  <Text name="text" value="$text"/>\n  <Labels name="label" toName="text">\n    <Label value="Person"/>\n    <Label value="Organization"/>\n    <Label value="Location"/>\n  </Labels>\n</View>',
  },
  {
    id: 'audio-classification',
    name: 'Audio Classification',
    description: 'Classify audio clips into categories',
    category: 'audio',
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop',
    tags: ['audio', 'classification'],
    config: '<View>\n  <Audio name="audio" value="$audio"/>\n  <Choices name="choice" toName="audio">\n    <Choice value="Speech"/>\n    <Choice value="Music"/>\n    <Choice value="Noise"/>\n  </Choices>\n</View>',
  },
  {
    id: 'video-classification',
    name: 'Video Classification',
    description: 'Classify video content',
    category: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=300&fit=crop',
    tags: ['video', 'classification'],
    config: '<View>\n  <Video name="video" value="$video"/>\n  <Choices name="choice" toName="video">\n    <Choice value="Action"/>\n    <Choice value="Drama"/>\n    <Choice value="Comedy"/>\n  </Choices>\n</View>',
  },
  {
    id: 'qa-pairs',
    name: 'Question Answering',
    description: 'Label question-answer pairs',
    category: 'conversational',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop',
    tags: ['text', 'QA', 'conversational'],
    config: '<View>\n  <Text name="question" value="$question"/>\n  <Text name="answer" value="$answer"/>\n  <Choices name="relevance" toName="question">\n    <Choice value="Relevant"/>\n    <Choice value="Irrelevant"/>\n  </Choices>\n</View>',
  },
];

interface TemplateGalleryProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string, config: string) => void;
}

export function TemplateGallery({
  selectedTemplateId,
  onTemplateSelect,
}: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex">
      {/* Category Sidebar */}
      <div className="w-56 border-r bg-muted/30 shrink-0">
        <div className="p-4 border-b">
          <h4 className="text-sm font-semibold">Categories</h4>
        </div>
        <div className="p-2">
          {TEMPLATE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                'hover:bg-muted',
                selectedCategory === category.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground'
              )}
            >
              <div className="flex items-center justify-between">
                <span>{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.count}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Template Cards */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onTemplateSelect(template.id, template.config)}
              className={cn(
                'group relative border rounded-lg overflow-hidden text-left transition-all',
                'hover:shadow-lg hover:border-primary/50',
                selectedTemplateId === template.id
                  ? 'border-primary shadow-md ring-2 ring-primary/20'
                  : 'border-border'
              )}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted overflow-hidden">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {selectedTemplateId === template.id ? (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                ) : null}
              </div>

              {/* Content */}
              <div className="p-3 space-y-1.5">
                <h4 className="font-semibold text-sm">{template.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-center">
            <div>
              <p className="text-muted-foreground mb-2">No templates found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
