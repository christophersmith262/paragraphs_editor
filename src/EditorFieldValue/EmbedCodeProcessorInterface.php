<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

interface EmbedCodeProcessorInterface {
  public function process($markup, EmbedCodeVisitorInterface $visitor);
}
