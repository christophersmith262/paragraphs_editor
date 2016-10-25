<?php

namespace Drupal\paragraphs_ckeditor\Controller;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\OpenModalDialogCommand;
use Drupal\Core\Ajax\AlertCommand;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\paragraphs_ckeditor\Ajax\ParagraphsCKEditorDataCommand;
use Drupal\paragraphs_ckeditor\ParagraphsCKEditorBundleListBuilder;

class ParagraphCommandController implements ContainerInjectionInterface {

  protected $entityTypeManager;
  protected $renderer;

  public function __construct($entity_type_manager, $renderer) {
    $this->entityTypeManager = $entity_type_manager;
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('renderer')
    );
  }

  public function insert($widget_build_id, $field_config_id) {
    $response = new AjaxResponse();
    $entity_type = $this->entityTypeManager->getDefinition('paragraphs_type');
    $storage = $this->entityTypeManager->getStorage('paragraphs_type');
    $list_builder = new ParagraphsCKEditorBundleListBuilder($entity_type, $storage);
    $r = $list_builder->render();
    $response->addCommand(new OpenModalDialogCommand(t('Add a paragraph'), $this->renderer->render($r)));
    return $response;
  }

  public function edit($widget_build_id, $field_config_id, $paragraph_uuid) {
    $response = new AjaxResponse();
    $response->addCommand(new OpenModalDialogCommand('test', 'edit'));
    return $response;
  }

  public function preview($widget_build_id, $field_config_id, $paragraph_uuid) {
    $response = new AjaxResponse();
    $response->addCommand(new OpenModalDialogCommand('test', 'preview'));
    return $response;
  }
}
