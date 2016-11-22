<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs\ParagraphInterface;

class DeliverParagraphPreviewCommand implements CommandInterface {

  protected $paragraph;
  protected $insert;
  protected $contextString;

  public function __construct($context_string, ParagraphInterface $paragraph, $insert = FALSE) {
    $this->contextString = $context_string;
    $this->paragraph = $paragraph;
    $this->insert = $insert;
  }

  public function render() {
    $view_builder = \Drupal::entityTypeManager()->getViewBuilder('paragraph');
    $storage = \Drupal::entityTypeManager()->getStorage('paragraph');
    $view =  $view_builder->view($this->paragraph, 'full');
    $markup = \Drupal::service('renderer')->render($view);
    return array(
      'command' => 'paragraphs_editor_data',
      'context' => $this->contextString,
      'editBufferItem' => array(
        'id' => $this->paragraph->uuid(),
        'context' => $this->contextString,
        'isNew' => $this->paragraph->isNew(),
        'insert' => $this->insert,
        'markup' => $markup,
      ),
    );
  }
}
