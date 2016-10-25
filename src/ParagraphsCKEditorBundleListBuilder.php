<?php

namespace Drupal\paragraphs_ckeditor;

use Drupal\Core\Entity\EntityListBuilder;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Ajax\AjaxResponse;

class ParagraphsCKEditorBundleListBuilder extends EntityListBuilder {

  /**
   * {@inheritdoc}
   */
  public function buildHeader() {
    $header['title'] = t('Type');
    $header['operations'] = t('Add Paragraph');
    return $header;
  }

  /**
   * {@inheritdoc}
   */
  public function buildRow(EntityInterface $entity) {
    $row['title'] = $entity->label;
    return $row + parent::buildRow($entity);
  }

  /**
   * {@inheritdoc}
   */
  public function buildOperations() {
    $build['select'] = array(
      '#type' => 'button',
      '#value' => t('Add'),
      '#ajax' => array(
        'callback' => array($this, 'ajaxSubmit'),
      ),
    );
    return $build;
  }
}
