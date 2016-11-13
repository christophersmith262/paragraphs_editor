<?php

namespace Drupal\paragraphs_ckeditor\EditorFieldValue;

interface EmbedCodeVisitorInterface {
  public function visit(\DOMNode $node, $paragraph_uuid, $context_string);
}

