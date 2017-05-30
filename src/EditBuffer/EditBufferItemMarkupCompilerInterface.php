<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

interface EditBufferItemMarkupCompilerInterface {

  public function compile(CommandContextInterface $context, EditBufferItemInterface $item, $view_mode);

  public function preprocessField(array &$variables);
}
