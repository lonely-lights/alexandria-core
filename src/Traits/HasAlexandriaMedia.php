<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @mixin Model
 * @mixin HasMedia
 */
trait HasAlexandriaMedia
{
    /**
     * Register media collections for page image, banner, and gallery.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('page_image')
            ->singleFile();

        $this->addMediaCollection('banner')
            ->singleFile();

        $this->addMediaCollection('gallery');
    }

    /**
     * Register media conversions driven by config values.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $pageImage = config('alexandria.media.page_image');
        $banner = config('alexandria.media.banner');
        $gallery = config('alexandria.media.gallery');

        // page_image conversions
        $this->addMediaConversion('square')
            ->width($pageImage['square']['width'])
            ->height($pageImage['square']['height'])
            ->sharpen(10)
            ->performOnCollections('page_image')
            ->nonQueued();

        $this->addMediaConversion('thumb')
            ->width($pageImage['thumb']['width'])
            ->height($pageImage['thumb']['height'])
            ->sharpen(10)
            ->performOnCollections('page_image')
            ->nonQueued();

        $this->addMediaConversion('small')
            ->width($pageImage['small']['width'])
            ->height($pageImage['small']['height'])
            ->sharpen(10)
            ->performOnCollections('page_image')
            ->nonQueued();

        // banner conversions
        $this->addMediaConversion('desktop')
            ->width($banner['desktop']['width'])
            ->height($banner['desktop']['height'])
            ->performOnCollections('banner')
            ->nonQueued();

        $this->addMediaConversion('mobile')
            ->width($banner['mobile']['width'])
            ->height($banner['mobile']['height'])
            ->performOnCollections('banner')
            ->nonQueued();

        $this->addMediaConversion('preview')
            ->width($banner['preview']['width'])
            ->height($banner['preview']['height'])
            ->performOnCollections('banner')
            ->nonQueued();

        // gallery conversions
        $this->addMediaConversion('display')
            ->width($gallery['display']['width'])
            ->performOnCollections('gallery')
            ->nonQueued();

        $this->addMediaConversion('gallery_thumb')
            ->width($gallery['thumb']['width'])
            ->height($gallery['thumb']['height'])
            ->sharpen(10)
            ->performOnCollections('gallery')
            ->nonQueued();
    }

    /**
     * Get the page image URL (square conversion).
     */
    public function getPageImageUrlAttribute(): string
    {
        return $this->getFirstMediaUrl('page_image', 'square') ?: $this->getFirstMediaUrl('page_image');
    }

    /**
     * Get the page image thumbnail URL.
     */
    public function getPageImageThumbUrlAttribute(): string
    {
        return $this->getFirstMediaUrl('page_image', 'thumb') ?: $this->getFirstMediaUrl('page_image');
    }

    /**
     * Get the banner desktop URL.
     */
    public function getBannerDesktopUrlAttribute(): string
    {
        return $this->getFirstMediaUrl('banner', 'desktop') ?: $this->getFirstMediaUrl('banner');
    }

    /**
     * Get the banner mobile URL.
     */
    public function getBannerMobileUrlAttribute(): string
    {
        return $this->getFirstMediaUrl('banner', 'mobile') ?: $this->getFirstMediaUrl('banner');
    }

    /**
     * Get the banner preview URL.
     */
    public function getBannerPreviewUrlAttribute(): string
    {
        return $this->getFirstMediaUrl('banner', 'preview') ?: $this->getFirstMediaUrl('banner');
    }

    /**
     * Determine whether the model has a page image.
     */
    public function hasPageImage(): bool
    {
        return $this->getFirstMedia('page_image') !== null;
    }

    /**
     * Determine whether the model has a banner.
     */
    public function hasBanner(): bool
    {
        return $this->getFirstMedia('banner') !== null;
    }
}
