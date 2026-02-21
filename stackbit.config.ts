import { defineStackbitConfig } from '@stackbit/types';

export default defineStackbitConfig({
    "stackbitVersion": "~0.6.0",
    "nodeVersion": "18",
    "ssgName": "custom",
    "contentSources": [],
    "postInstallCommand": "npm i --no-save @stackbit/types",
    "models": {
        "page": {
            "type": "page",
            "label": "Page",
            "filePath": "content/pages/{slug}.md",
            "fields": [
                { "type": "string", "name": "title", "label": "Title", "required": true },
                { "type": "string", "name": "slug", "label": "Slug", "required": true },
                { "type": "markdown", "name": "content", "label": "Content" },
                { "type": "string", "name": "layout", "label": "Layout", "default": "default" },
                { "type": "list", "name": "sections", "label": "Sections", "items": { "type": "model", "models": ["hero", "features", "cta"] } }
            ]
        },
        "post": {
            "type": "page",
            "label": "Blog Post",
            "filePath": "content/posts/{slug}.md",
            "fields": [
                { "type": "string", "name": "title", "label": "Title", "required": true },
                { "type": "string", "name": "slug", "label": "Slug", "required": true },
                { "type": "date", "name": "date", "label": "Date", "required": true },
                { "type": "markdown", "name": "content", "label": "Content" },
                { "type": "image", "name": "featuredImage", "label": "Featured Image" },
                { "type": "list", "name": "tags", "label": "Tags", "items": { "type": "string" } }
            ]
        },
        "hero": {
            "type": "object",
            "label": "Hero Section",
            "fields": [
                { "type": "string", "name": "title", "label": "Title" },
                { "type": "string", "name": "subtitle", "label": "Subtitle" },
                { "type": "image", "name": "backgroundImage", "label": "Background Image" },
                { "type": "model", "name": "cta", "label": "Call to Action", "models": ["button"] }
            ]
        },
        "features": {
            "type": "object",
            "label": "Features Section",
            "fields": [
                { "type": "string", "name": "title", "label": "Title" },
                { "type": "list", "name": "items", "label": "Feature Items", "items": { "type": "model", "models": ["feature"] } }
            ]
        },
        "feature": {
            "type": "object",
            "label": "Feature",
            "fields": [
                { "type": "string", "name": "title", "label": "Title" },
                { "type": "string", "name": "description", "label": "Description" },
                { "type": "image", "name": "icon", "label": "Icon" }
            ]
        },
        "cta": {
            "type": "object",
            "label": "CTA Section",
            "fields": [
                { "type": "string", "name": "title", "label": "Title" },
                { "type": "string", "name": "description", "label": "Description" },
                { "type": "model", "name": "button", "label": "Button", "models": ["button"] }
            ]
        },
        "button": {
            "type": "object",
            "label": "Button",
            "fields": [
                { "type": "string", "name": "label", "label": "Label" },
                { "type": "string", "name": "url", "label": "URL" },
                { "type": "enum", "name": "variant", "label": "Variant", "options": ["primary", "secondary", "outline"] }
            ]
        }
    },
    "siteMap": [
        { "label": "Pages", "urlPath": "/", "modelName": "page" },
        { "label": "Blog", "urlPath": "/blog", "modelName": "post" }
    ]
})