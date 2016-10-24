<?php

namespace Drupal\paragraphs_ckeditor\CKEditorState;

use Drupal\Core\KeyValueStore\KeyValueExpirableFactoryInterface;

class ParagraphsCKEditorStateCache implements ParagraphsCKEditorStateCacheInterface {

  protected $storage;
  protected $expiry;

  public function __construct(KeyValueExpirableFactoryInterface $storage, $expiry) {
    $this->storage = $storage;
    $this->expiry = $expiry;
  }

  public function setCache($form_build_id, ParagraphsCKEditorStateInterface $state) {
    $this->storage->get('paragraphs_ckeditor_state')->setWithExpire($form_build_id, $state, $this->expiry);
  }

  public function getCache($form_build_id) {
    $this->storage->get('paragraphs_ckeditor_state')->get($form_build_id);
  }

  public function deleteCache($form_build_id) {
    $this->storage->get('paragraphs_ckeditor_state')->delete($form_build_id);
  }
}
