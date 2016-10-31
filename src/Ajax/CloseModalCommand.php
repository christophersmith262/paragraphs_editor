<?php

namespace Drupal\paragraphs_ckeditor\Ajax;

use Drupal\Core\Ajax\CloseModalDialogCommand;

class CloseModalCommand extends CloseModalDialogCommand {

  public function __construct($persist = FALSE) {
    parent::__construct($persist);
   $this->selector = '#paragraphs-ckeditor-modal';
  }
}
