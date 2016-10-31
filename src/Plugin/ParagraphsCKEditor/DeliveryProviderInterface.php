<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

interface DeliveryProviderInterface {
  public function navigate(AjaxResponse $response, CommandContextInterface $context, $title, $contents);
  public function render(AjaxResponse $response, CommandContextInterface $context, EditBufferItemInterface $item);
  public function duplicate(AjaxResponse $response, CommandContextInterface $context, EditBufferItemInterface $item, $ckeditor_widget_id);
  public function close(AjaxResponse $response, CommandContextInterface $context);
}
