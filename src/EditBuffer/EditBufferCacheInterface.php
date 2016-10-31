<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

interface EditBufferCacheInterface {
  public function get($widget_build_id);
  public function delete($widget_build_id);
}
