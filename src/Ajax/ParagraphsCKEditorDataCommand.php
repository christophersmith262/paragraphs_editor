<?php

namespace Drupal\paragraphs_ckeditor\Ajax;

use Drupal\Core\Ajax\CommandInterface;

class ParagraphsCKEditorDataCommand implements CommandInterface {

  protected $selector;
  protected $messageId;
  protected $data;

  public function __construct($selector, $message_id, $data) {
    $this->selector = $selector;
    $this->messageId = $message_id;
    $this->data = $data;
  }

  /**
   * {@inheritdoc}
   */
  public function render() {
    return array(
      'command' => 'paragraphs_ckeditor_data',
      'selector' => $this->selector,
      'id' => $this->messageId,
      'data' => $this->data,
    );
  }
}
