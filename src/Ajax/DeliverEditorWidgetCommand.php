<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs\ParagraphInterface;

class DeliverEditorWidgetCommand implements CommandInterface {
  protected $contextString;
  protected $widgetId;
  protected $paragraphUuid;

  public function __construct($target_context, ParagraphInterface $paragraph, $ckeditor_widget_id) {
    $this->context = $target_context;
    $this->widgetId = $ckeditor_widget_id;
    $this->paragraphUuid = $paragraph->uuid();
  }

  public function render() {
    return array(
      'command' => 'paragraphs_editor_data',
      'context' => $this->context->getEditBuffer()->getParentBufferTag(),
      'widget' => array(
        'id' => $this->widgetId,
        'itemId' => $this->paragraphUuid,
        'itemContext' => $this->context->getContextString(),
        'duplicating' => false,
      ),
    );
  }
}
