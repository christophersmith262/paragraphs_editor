<?php

namespace Drupal\paragraphs_ckeditor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs\ParagraphInterface;

class DeliverParagraphPreviewCommand implements CommandInterface {

  protected $paragraph;
  protected $insert;
  protected $widgetBuildId;

  public function __construct($widget_build_id, ParagraphInterface $paragraph, $insert = FALSE) {
    $this->widgetBuildId = $widget_build_id;
    $this->paragraph = $paragraph;
    $this->insert = $insert;
  }

  public function render() {
    $view_builder = \Drupal::entityTypeManager()->getViewBuilder('paragraph');
    $storage = \Drupal::entityTypeManager()->getStorage('paragraph');
    $view =  $view_builder->view($this->paragraph, 'full');
    $markup = \Drupal::service('renderer')->render($view);
    return array(
      'command' => 'paragraphs_ckeditor_data',
      'widget' => $this->widgetBuildId,
      'preview' => array(
        'id' => $this->paragraph->uuid(),
        'isNew' => $this->paragraph->isNew(),
        'insert' => $this->insert,
        'markup' => $markup,
      ),
    );
  }
}
