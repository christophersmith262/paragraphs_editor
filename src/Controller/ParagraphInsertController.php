<?php

class ParagraphInsertController {

  protected $formBuilder;

  public function editModal($form_build_id, $entity = NULL) {
    $form_state = new FormState();
    $form = $this->formBuilder->getCache($form_build_id, $form_state);
    $this->formBuilder->setCache($form_build_id, $form, $form_state);
  }

}
