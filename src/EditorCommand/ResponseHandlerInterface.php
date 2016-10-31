<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

interface ResponseHandlerInterface {
  public function deliverBundleSelectForm(CommandContextInterface $context);
  public function deliverParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item);
  public function deliverRenderedParagraph(CommandContextInterface $context, EditBufferItemInterface $item);
  public function deliverDuplicate(CommandContextInterface $context, EditBufferItemInterface $item, $ckeditor_widget_id);
  public function deliverCloseForm(CommandContextInterface $context);
}
