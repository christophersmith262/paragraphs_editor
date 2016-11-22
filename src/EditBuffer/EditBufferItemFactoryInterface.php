<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

interface EditBufferItemFactoryInterface {
  public function createBufferItem(CommandContextInterface $context, $bundle_name);
  public function getBufferItem(CommandContextInterface $context, $paragraph_uuid);
}
