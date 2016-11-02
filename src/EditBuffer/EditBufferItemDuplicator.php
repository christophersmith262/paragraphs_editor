<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\paragaphs_ckeditor\EditorCommand\CommandContextInterface;

class EditBufferItemDuplicator implements EditBufferItemDuplicatorInterface {

  public function duplicate(CommandContextInterface $context, EditBufferItemInterface $item) {
    return $item;
  }
}
