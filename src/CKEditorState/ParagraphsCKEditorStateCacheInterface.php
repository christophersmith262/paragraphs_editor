<?php

namespace Drupal\paragraphs_ckeditor\CKEditorState;

use Drupal\Core\KeyValueStore\KeyValueExpirableFactoryInterface;

interface ParagraphsCKEditorStateCacheInterface {
  public function setCache($form_build_id, ParagraphsCKEditorStateInterface $state);
  public function getCache($form_build_id);
  public function deleteCache($form_build_id);
}
