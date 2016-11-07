<?php

namespace Drupal\paragraphs_ckeditor\ParagraphCompiler;

class ParagraphDecompiler {

  protected $embedTemplate;
  protected $contextString;
  protected $textBundle;

  public function __construct(array $embed_template, $text_bundle, $context_string) {
    $this->embedTemplate = $embed_template;
    $this->contextString = $context_string;
  }

  public function decompile(FieldItemListInterface $items) {
    $markup = '';
    foreach ($items as $item) {
      $paragraph = $item->getTargetEntity();
      if ($paragraph->bundle() == $this->textBundle) {
        $markup .= $item->getValue();
      }
      else {
        $markup .= $this->createEmbedCode($paragraph);
      }
    }
    return $markup;
  }

  protected function createEmbedCode(ParagraphInterface $paragraph) {
    $tag_values = array($this->embedTemplate['tag']);
    foreach ($this->embedTemplate['attributes'] as $type => $attribute_name) {
      if ($type == 'uuid') {
        $tag_values[] = $attribute_name . '="' . $paragraph->uuid() . '"';
      }
      else if ($type == 'context') {
        $tag_values[] = $attribute_name . '="' . $this->contextString . '"';
      }
    }

    $embed = '<' . implode(' ', $tag_values) . '>';
    if ($this->embedTemplate['close']) {
      $embed .= '></' . $this->embedTemplate['tag'];
    }

    return $embed;
  }
}
