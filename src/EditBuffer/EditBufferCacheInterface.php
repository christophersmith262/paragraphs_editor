<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

interface EditBufferCacheInterface {
  public function get($widget_build_id, $context_string);
  public function delete($widget_build_id);
}
