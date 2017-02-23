<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;

class DeliverEditBufferItemCommand implements CommandInterface {

  protected $item;
  protected $insert;
  protected $context;

  public function __construct($target_context, EditBufferItemInterface $item, $insert = FALSE) {
    $this->context = $target_context;
    $this->item = $item;
    $this->insert = $insert;
    $this->markupCompiler = \Drupal::service('paragraphs_editor.edit_buffer.markup_compiler');
  }

  public function render() {
    $paragraph = $this->item->getEntity();
    $result = $this->markupCompiler->compile($this->item);
    $command = array(
      'command' => 'paragraphs_editor_data',
      'context' => $this->context->getContextString(),
      'editBufferItem' => array(
        'id' => $paragraph->uuid(),
        'isNew' => $paragraph->isNew(),
        'insert' => $this->insert,
        'markup' => $result->getMarkup(),
        'fields' => $result->getFieldMap(),
        'bundle' => $paragraph->bundle(),
      ),
    );
    if ($this->item->getContextMap()) {
      $command['updateContexts'] = $this->item->getContextMap();
    }
    return $command;
  }

}
