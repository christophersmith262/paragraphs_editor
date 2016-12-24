<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CloseModalDialogCommand;

class CloseModalCommand extends CloseModalDialogCommand {

  public function __construct($target_context, $persist = FALSE) {
    parent::__construct($persist);
   $this->selector = '#paragraphs-ckeditor-modal-' . md5($target_context->getContextString());
  }
}
