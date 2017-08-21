<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\OpenModalDialogCommand;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

/**
 * Opens an ajax dialog for a specific editor context.
 */
class OpenModalCommand extends OpenModalDialogCommand {

  /**
   * Creates an OpenModelCommand.
   *
   * @param string $title
   *   The title of the dialog.
   * @param string|array $content
   *   The content that will be placed in the dialog, either a render array
   *   or an HTML string.
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context to open the dialog for.
   * @param array $dialog_options
   *   (optional) Settings to be passed to the dialog implementation. Any
   *   jQuery UI option can be used. See http://api.jqueryui.com/dialog.
   * @param array|null $settings
   *   (optional) Custom settings that will be passed to the Drupal behaviors
   *   on the content of the dialog. If left empty, the settings will be
   *   populated automatically from the current request.
   *
   * @constructor
   */
  public function __construct($title, $content, CommandContextInterface $context, array $dialog_options = [], $settings = NULL) {
    if (empty($dialog_options['width'])) {
      $dialog_options['width'] = '50%';
      $dialog_options['dialogClass'] = 'paragraphs-editor-dialog';
    }

    parent::__construct($title, $content, $dialog_options, $settings);
    $this->selector = '#paragraphs-ckeditor-modal-' . md5($context->getContextString());
  }

}
