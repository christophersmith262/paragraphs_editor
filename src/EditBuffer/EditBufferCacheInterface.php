<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

interface EditBufferCacheInterface {
  public function get($context_string);
  public function delete($context_string);
  public function save(EditBufferInterface $buffer);
}
