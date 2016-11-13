<?php

namespace Drupal\paragraphs_ckeditor\EditorFieldValue;

interface EmbedCodeProcessorInterface {
  public function process($markup, EmbedCodeVisitorInterface $visitor);
}
