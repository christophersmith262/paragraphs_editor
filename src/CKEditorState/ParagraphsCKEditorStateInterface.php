<?php

namespace Drupal\paragraphs_ckeditor\CKEditorState;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs\ParagraphInterface;

interface ParagraphsCKEditorStateInterface {
  public function createParagraph(EntityTypeManagerInterface $entity_type_manager, $bundle_name);
  public function storeParagraph(ParagraphInterface $paragraph);
  public function getParagraph($uuid);
}
