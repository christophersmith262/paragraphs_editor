<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

interface EditBufferItemInterface {
  public function getEntity();
  public function save();
}
