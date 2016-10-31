<?php

namespace Drupal\paragraphs_ckeditor\Ajax;

use Drupal\Core\Ajax\OpenModalDialogCommand;

class OpenModalCommand extends OpenModalDialogCommand {

  /**
   * {@inheritdoc}
   */
 public function __construct($title, $content, array $dialog_options = array(), $settings = NULL) {
   if (empty($dialog_options['width'])) {
     $dialog_options['width'] = '50%';
   }

   parent::__construct($title, $content, $dialog_options, $settings);
   $this->selector = '#paragraphs-ckeditor-modal';
 }
}
