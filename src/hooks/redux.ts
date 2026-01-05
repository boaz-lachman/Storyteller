/**
 * Custom Redux hooks with TypeScript support
 */
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

/**
 * Typed useDispatch hook
 * Use this instead of plain useDispatch for better TypeScript support
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed useSelector hook
 * Use this instead of plain useSelector for better TypeScript support
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
