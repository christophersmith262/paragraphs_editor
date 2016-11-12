<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

interface EditBufferItemFactoryInterface {
  public function createBufferItem(CommandContextInterface $context, $bundle_name);
  public function getBufferItem(CommandContextInterface $context, $paragraph_uuid);
}
