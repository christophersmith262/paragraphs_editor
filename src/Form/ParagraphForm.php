<?php

namespace Drupal\paragraphs_ckeditor\Form;

use Symfony\Component\DependencyInjection\ContainerInterface;

use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Url;

class SubscriptionForm extends ContentEntityForm {

