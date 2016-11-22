<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Component\Utility\Html;

class EmbedCodeProcessor implements EmbedCodeProcessorInterface {

  protected $embedTemplate;

  public function __construct(array $embed_template) {
    $this->embedTemplate = $embed_template;
    $this->marker = Html::cleanCssIdentifier("paragraphs-ckeditor-embed");
  }

  public function process($markup, EmbedCodeVisitorInterface $visitor) {
    // Preprocess the markup to ensure valid html for embed codes.
    $markup = $this->preprocessEmbedCodes($markup);

    // Load a DOM document and associated xpath object so we can easily locate
    // embed codes within the document.
    $document = Html::load($markup);
    $xpath = new \DOMXPath($document);

    $embed_nodes = $xpath->query('//div[contains(concat(" ", normalize-space(@class), " "), " ' . $this->marker . ' ")]');
    foreach ($embed_nodes as $node) {
      $attributes = array();
      foreach ($this->embedTemplate['attributes'] as $key => $attribute_name) {
        if ($node->hasAttribute($attribute_name)) {
          $attributes[$key] = $node->getAttribute($attribute_name);
        }
        else {
          $attributes[$key] = NULL;
        }
      }
      $paragraph_uuid = !empty($attributes['uuid']) ? $attributes['uuid'] : NULL;
      $context_string = !empty($attributes['context']) ? $attributes['context'] : NULL;
      $visitor->visit($node, $paragraph_uuid, $context_string);
    }

    return Html::serialize($document);
  }

  protected function preprocessEmbedCodes($markup) {
    $tag = $this->embedTemplate['tag'];
    $markup = preg_replace('/<' . $tag . '/', '<div class="' . $this->marker . '"', $markup);

    if ($this->embedTemplate['close']) {
      $markup = preg_replace('/' . $tag . '>/', 'div>', $markup);
    }

    return $markup;
  }
}
