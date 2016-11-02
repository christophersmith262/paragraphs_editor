<?php

namespace Drupal\paragraphs_ckeditor\ParamConverter;

use Drupal\Core\ParamConverter\ParamConverterInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Route;

/**
 * Route parameter converter for paragraphs ckeditor command contexts.
 */
class CommandContextConverter implements ParamConverterInterface {

  /**
   * The context factory for creating command contexts.
   *
   * @var \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;
  protected $request;

  /**
   * Creates a paragraphs ckeditor command context route parameter converter.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory to use for creating command contexts.
   */
  public function __construct(RequestStack $request_stack, CommandContextFactoryInterface $context_factory) {
    $this->contextFactory = $context_factory;
    $this->request = $request_stack->getCurrentRequest();
  }

  /**
   * {@inheritdoc}
   */
  public function convert($value, $definition, $name, array $defaults) {
    // Separate out the relevant parts of the context string.
    $context_params = explode(':', $value);
    $entity_type = array_shift($context_params);
    $field_config_id = array_shift($context_params);
    $widget_build_id = array_shift($context_params);
    $entity_id = array_shift($context_params);

    // Try to pull the settings for the field from the POSTed parameters.
    $settings = $this->request->get('settings');
    if (!is_array($settings)) {
      $settings = array();
    }

    $context = $this->contextFactory->create($entity_type, $entity_id, $field_config_id, $widget_build_id, $settings);

    if (isset($definition['command'])) {
      $context->addAdditionalContext('command', $definition['command']);
    }

    return $context;
  }

  /**
   * {@inheritdoc}
   */
  public function applies($definition, $name, Route $route) {
    return (!empty($definition['type']) && $definition['type'] == 'paragraphs_ckeditor_command_context');
  }
}
