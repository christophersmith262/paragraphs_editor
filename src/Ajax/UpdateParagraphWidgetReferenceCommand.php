<?php

namespace Drupal\paragraphs_ckeditor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs\ParagraphInterface;

class UpdateParagraphWidgetReferenceCommand implements CommandInterface {
  protected $contextString;
  protected $widgetId;
  protected $paragraphUuid;

  public function __construct($context_string, ParagraphInterface $paragraph, $ckeditor_widget_id) {
    $this->contextString = $context_string;
    $this->widgetId = $ckeditor_widget_id;
    $this->paragraphUuid = $paragraph->uuid();
  }

  public function render() {
    return array(
      'command' => 'paragraphs_ckeditor_data',
      'context' => $this->contextString,
      'widget' => array(
        'id' => $this->widgetId,
        'previewId' => $this->paragraphUuid,
      ),
    );
  }
}