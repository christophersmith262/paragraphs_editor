<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;

interface DeliveryProviderInterface {
  public function navigate(AjaxResponse $response, $title, $contents);
  public function render(AjaxResponse $response, EditBufferItemInterface $item);
  public function duplicate(AjaxResponse $response, EditBufferItemInterface $item, $ckeditor_widget_id);
  public function close(AjaxResponse $response);
}
