<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\OpenModalDialogCommand;

class OpenModalCommand extends OpenModalDialogCommand {

  /**
   * {@inheritdoc}
   */
 public function __construct($title, $content, $target_context, array $dialog_options = array(), $settings = NULL) {
   if (empty($dialog_options['width'])) {
     $dialog_options['width'] = '50%';
     $dialog_options['dialogClass'] = 'paragraphs-editor-dialog';
   }

   parent::__construct($title, $content, $dialog_options, $settings);
   $this->selector = '#paragraphs-ckeditor-modal-' . md5($target_context->getContextString());
 }
}
