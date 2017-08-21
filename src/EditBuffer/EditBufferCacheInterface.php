<?php

namespace Drupal\paragraphs_editor\EditBuffer;

/**
 *
 */
interface EditBufferCacheInterface {

  /**
   *
   */
  public function get($context_string);

  /**
   *
   */
  public function delete($context_string);

  /**
   *
   */
  public function save(EditBufferInterface $buffer);

}
