#!/usr/bin/env python3
"""Two-stage symmetry-adapted HEOM: a transparent, independently checked example.

Basis: (|c>, |e_1>, ..., |e_N>); hbar=1; one exponential C(t)=c exp(-nu t),
real nu, check_c=c.conjugate(), factorized initial bath, hard total-tier cutoff.
Only fully permutation-invariant initial operators are represented here.

The reduced builder and RHS never allocate an N-sized molecule list or dense
ADO matrices. Dictionaries are used during construction only; the runtime
RHS uses three NumPy arrays (row, column, coefficient). The intentionally slow
full-HEOM functions are SMALL-N validation oracles, not production solvers.
No terminator, disorder, cavity loss, or distinguished-molecule solver is hidden
in this example. It is a teaching implementation, not the paper's source code.

Usage:
    python heom_tutorial.py --test
    python heom_tutorial.py --counts --N 1000000000000 --L 25
    python heom_tutorial.py --demo --N 4 --L 5 --output heom_demo.csv
Requires Python 3.10+ and NumPy. All demo units are arbitrary and consistent.
"""
from __future__ import annotations
import argparse
import csv
import math
from collections import Counter
from collections.abc import Iterator
from pathlib import Path
import numpy as np


def partitions(total: int, max_part: int | None = None,
               max_length: int | None = None) -> Iterator[tuple[int, ...]]:
    """Positive entries, descending; the unique partition of zero is ()."""
    if total == 0:
        yield ()
        return
    if max_length is not None and max_length <= 0:
        return
    top = total if max_part is None else min(total, max_part)
    for first in range(top, 0, -1):
        remaining_length = None if max_length is None else max_length - 1
        for tail in partitions(total-first, first, remaining_length):
            yield (first,) + tail


def patterns(N: int, L: int) -> list[tuple[int, ...]]:
    if N < 1 or L < 0:
        raise ValueError('N must be >=1 and L must be >=0.')
    return [p for tier in range(L+1) for p in partitions(tier, max_length=N)]


def multiplicities(p: tuple[int, ...], N: int) -> dict[int, int]:
    counts = dict(Counter(p))
    if len(p) < N:
        counts[0] = N - len(p)
    return counts


def variable_keys(p: tuple[int, ...], N: int) -> list[tuple]:
    """A fixed non-Hermitian bookkeeping basis, retaining both X and Y."""
    M = multiplicities(p, N)
    categories = sorted(M, reverse=True)
    keys = [('Z',)]
    for q in categories:
        keys.extend([('X',q), ('Y',q), ('P',q)])
    keys.extend(('S',q,r) for q in categories for r in categories if q != r)
    keys.extend(('T',q) for q in categories if M[q] >= 2)
    return keys


def counts(N: int, L: int) -> tuple[int, int, int]:
    """Conventional ADO count, canonical ADO count, unique-variable count."""
    ps = patterns(N, L)
    unique = 0
    for p in ps:
        M = multiplicities(p, N)
        unique += (len(M)+1)**2 + sum(v >= 2 for v in M.values())
    return math.comb(N+L,L), len(ps), unique


def entry_key(raw: tuple[int, ...], a: int, b: int) -> tuple:
    """Aligned entry: system index 0 is cavity, molecule i has raw[i-1].

    raw remains in the SOURCE labeling, even if its sorted target is different.
    This avoids the common mistake of sorting the hierarchy without relabeling
    the matrix indices. Equal row and column identities mean P, not T.
    """
    if a == 0 and b == 0:
        return ('Z',)
    if b == 0:
        return ('X',raw[a-1])
    if a == 0:
        return ('Y',raw[b-1])
    q, r = raw[a-1], raw[b-1]
    if a == b:
        return ('P',q)
    return ('T',q) if q == r else ('S',q,r)


def representative_pair(key: tuple, raw: tuple[int, ...]) -> tuple[int,int]:
    def first(q: int) -> int:
        return raw.index(q)+1
    tag = key[0]
    if tag == 'Z': return 0,0
    if tag == 'X': return first(key[1]),0
    if tag == 'Y': return 0,first(key[1])
    if tag == 'P': return first(key[1]),first(key[1])
    if tag == 'S': return first(key[1]),first(key[2])
    indices = [i+1 for i,q in enumerate(raw) if q == key[1]]
    return indices[0],indices[1]


def build_reduced(N: int, L: int, wc: float, ex: float, g: float,
                  c: complex, nu: float) -> tuple:
    """Build coefficient triples for the EXACT same finite hard-cutoff HEOM.

    A representative uses <=L occupied molecules and <=2 zero-category labels.
    All OTHER equivalent zero-category molecules appear only in multiplicities.
    Thus increasing N past L+2 never enlarges the representation or edge count.
    """
    if not all(np.isfinite(v) for v in (wc,ex,g,c.real,c.imag,nu)):
        raise ValueError('All parameters must be finite.')
    if abs(c) == 0 or nu < 0:
        raise ValueError('Use nonzero c and a real nonnegative nu.')
    ps = patterns(N,L)
    index = {(p,key): i for i,(p,key) in enumerate(
        (p,key) for p in ps for key in variable_keys(p,N))}
    rows,cols,values = [],[],[]
    for p in ps:
        M = multiplicities(p,N)
        # O(L), NOT O(N), even when N=10**12.
        raw = p + (0,)*min(2,N-len(p))
        tier = sum(p)
        for key in variable_keys(p,N):
            row = index[p,key]
            terms: dict[int,complex] = {}
            def add(target_pattern: tuple[int,...], target_key: tuple,
                    coefficient: complex) -> None:
                j = index[target_pattern,target_key]
                terms[j] = terms.get(j,0j)+coefficient
            def own(target_key: tuple, coefficient: complex) -> None:
                add(p,target_key,coefficient)
            def molecular_sum(q: int, coefficient: complex,
                              transpose: bool = False) -> None:
                own(('P',q),coefficient)
                if M[q] >= 2:
                    own(('T',q),coefficient*(M[q]-1))
                for r in M:
                    if r != q:
                        own(('S',r,q) if transpose else ('S',q,r),
                            coefficient*M[r])
            own(key,-nu*tier)
            tag = key[0]
            if tag == 'Z':
                for q in M:
                    own(('X',q),-1j*g*M[q]); own(('Y',q),1j*g*M[q])
            elif tag == 'X':
                q=key[1]
                own(key,-1j*(ex-wc)); own(('Z',),-1j*g)
                molecular_sum(q,1j*g)
            elif tag == 'Y':
                q=key[1]
                own(key,-1j*(wc-ex)); own(('Z',),1j*g)
                molecular_sum(q,-1j*g,transpose=True)
            else:
                q=key[1]; r=key[2] if tag == 'S' else q
                own(('Y',r),-1j*g); own(('X',q),1j*g)
            a,b = representative_pair(key,raw)
            # Exactly one row and one column term, not a molecular-size sum.
            for i,side in ((a,-1),(b,1)):
                if i == 0:
                    continue
                q=raw[i-1]
                if tier < L:
                    target=list(raw); target[i-1]+=1; target=tuple(target)
                    pp=tuple(sorted((v for v in target if v),reverse=True))
                    add(pp,entry_key(target,a,b),side*1j*math.sqrt((q+1)*abs(c)))
                if q > 0:
                    target=list(raw); target[i-1]-=1; target=tuple(target)
                    pp=tuple(sorted((v for v in target if v),reverse=True))
                    bath_c=c if side == -1 else c.conjugate()
                    add(pp,entry_key(target,a,b),side*1j*math.sqrt(q/abs(c))*bath_c)
            for j,value in sorted(terms.items()):
                if value != 0:
                    rows.append(row); cols.append(j); values.append(value)
    return (np.array(rows,dtype=np.int64),np.array(cols,dtype=np.int64),
            np.array(values,dtype=np.complex128),index)


def rhs_reduced(state: np.ndarray, rows: np.ndarray, cols: np.ndarray,
                coefficients: np.ndarray) -> np.ndarray:
    out=np.zeros_like(state)
    np.add.at(out,rows,coefficients*state[cols])
    return out


def full_labels(N: int, L: int) -> list[tuple[int,...]]:
    if N == 0:
        return [()]
    return [(q,)+tail for q in range(L+1) for tail in full_labels(N-1,L-q)]


def expand(state: np.ndarray, index: dict, labels: list[tuple[int,...]],
           N: int) -> np.ndarray:
    out=np.empty((len(labels),N+1,N+1),dtype=np.complex128)
    for k,raw in enumerate(labels):
        p=tuple(sorted((q for q in raw if q),reverse=True))
        for a in range(N+1):
            for b in range(N+1):
                out[k,a,b]=state[index[p,entry_key(raw,a,b)]]
    return out


def rhs_full(state: np.ndarray, labels: list[tuple[int,...]], L: int,
             wc: float, ex: float, g: float, c: complex, nu: float) -> np.ndarray:
    """Independent dense-ADO reference. Use only tiny N and L."""
    N=len(labels[0]); pos={raw:k for k,raw in enumerate(labels)}
    H=np.diag([wc]+[ex]*N).astype(np.complex128)
    H[0,1:]=g; H[1:,0]=g
    Q=[]
    for i in range(N):
        q=np.zeros((N+1,N+1)); q[i+1,i+1]=1; Q.append(q)
    out=np.empty_like(state)
    for k,raw in enumerate(labels):
        R=state[k]; tier=sum(raw)
        dR=-1j*(H@R-R@H)-nu*tier*R
        for i,q in enumerate(raw):
            if tier < L:
                target=list(raw); target[i]+=1
                A=state[pos[tuple(target)]]
                dR+=-1j*math.sqrt((q+1)*abs(c))*(Q[i]@A-A@Q[i])
            if q:
                target=list(raw); target[i]-=1
                A=state[pos[tuple(target)]]
                dR+=-1j*math.sqrt(q/abs(c))*(c*Q[i]@A-c.conjugate()*A@Q[i])
        out[k]=dR
    return out


def rk4(state: np.ndarray, dt: float, rhs) -> np.ndarray:
    k1=rhs(state); k2=rhs(state+0.5*dt*k1)
    k3=rhs(state+0.5*dt*k2); k4=rhs(state+dt*k3)
    return state+dt*(k1+2*k2+2*k3+k4)/6


def initial_state(index: dict, N: int, kind: str = 'upper') -> np.ndarray:
    state=np.zeros(len(index),dtype=np.complex128)
    if kind == 'cavity':
        state[index[(),('Z',)]]=1
    elif kind == 'upper':
        # Resonant convention: (|c>+|B>)/sqrt(2).
        for key,value in [(('Z',),.5),(('X',0),.5/math.sqrt(N)),
                          (('Y',0),.5/math.sqrt(N)),(('P',0),.5/N)]:
            state[index[(),key]]=value
        if N >= 2: state[index[(),('T',0)]]=.5/N
    else:
        raise ValueError('kind must be cavity or upper.')
    return state


def run_tests() -> None:
    rng=np.random.default_rng(417)
    for N in range(1,5):
        for L in (0,1,2,3):
            parameters=(.13,-.07,.21/math.sqrt(N),.035-.012j,.6)
            rows,cols,coef,index=build_reduced(N,L,*parameters)
            state=rng.normal(size=len(index))+1j*rng.normal(size=len(index))
            labels=full_labels(N,L)
            lhs=rhs_full(expand(state,index,labels,N),labels,L,*parameters)
            rhs=expand(rhs_reduced(state,rows,cols,coef),index,labels,N)
            error=np.max(np.abs(lhs-rhs))
            assert error < 1e-12,(N,L,error)
            print(f'RHS N={N}, L={L}: {len(index)} variables, max error {error:.3e}')
    expected={25:(9296,306743),26:(9296,306750),27:(9296,306751),
              10**12:(9296,306751)}
    for N,want in expected.items():
        _,can,unique=counts(N,25)
        assert (can,unique)==want,(N,can,unique)
    print('L=25 exact combinatorial counts: PASS (including N=10**12)')
    # Check N-independent edge count beyond saturation without huge allocations.
    sizes=[]
    for N in (5,100,10**12):
        row,col,coef,idx=build_reduced(N,3,0.,0.,.2/math.sqrt(N),.04-.01j,.8)
        sizes.append((len(idx),len(coef)))
    assert len(set(sizes))==1,sizes
    print('L=3 runtime graph saturation: PASS',sizes[0])
    N,L=2,3; parameters=(0.,0.,.2/math.sqrt(N),.04-.01j,.8)
    row,col,coef,index=build_reduced(N,L,*parameters)
    state=initial_state(index,N); labels=full_labels(N,L)
    full=expand(state,index,labels,N)
    reduced_rhs=lambda y: rhs_reduced(y,row,col,coef)
    full_rhs=lambda y: rhs_full(y,labels,L,*parameters)
    max_error=trace_error=hermiticity=0.
    for _ in range(200):
        state=rk4(state,.01,reduced_rhs); full=rk4(full,.01,full_rhs)
        max_error=max(max_error,float(np.max(np.abs(full-expand(state,index,labels,N)))))
        rho=full[labels.index((0,)*N)]
        trace_error=max(trace_error,float(abs(np.trace(rho)-1)))
        hermiticity=max(hermiticity,float(np.max(np.abs(rho-rho.conj().T))))
    assert max_error < 1e-11 and trace_error < 1e-11 and hermiticity < 1e-11
    print(f'200-step trajectory: max hierarchy error={max_error:.3e}, '
          f'trace error={trace_error:.3e}, Hermiticity error={hermiticity:.3e}')
    print('All tests passed. Algebraic agreement is NOT an L-convergence test.')


def demo(N: int,L: int,output: Path) -> None:
    row,col,coef,index=build_reduced(N,L,0.,0.,.2/math.sqrt(N),.04-.01j,.8)
    state=initial_state(index,N)
    rhs=lambda y: rhs_reduced(y,row,col,coef)
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('w',newline='') as f:
        writer=csv.writer(f); writer.writerow(['time','cavity','bright','dark','upper','lower','trace'])
        for step in range(501):
            Z=state[index[(),('Z',)]]; X=state[index[(),('X',0)]]
            Y=state[index[(),('Y',0)]]; P=state[index[(),('P',0)]]
            T=state[index[(),('T',0)]] if N>=2 else 0j
            B=P+(N-1)*T; D=(N-1)*(P-T)
            plus=(Z+B+math.sqrt(N)*(X+Y))/2
            minus=(Z+B-math.sqrt(N)*(X+Y))/2
            writer.writerow([step*.01,*[float(v.real) for v in (Z,B,D,plus,minus,Z+N*P)]])
            if step<500: state=rk4(state,.01,rhs)
    print(f'Wrote {output}; N={N}, L={L}, {len(index)} variables; arbitrary units.')
    print('This demo is not a reproduction of a paper figure; test L and dt separately.')


def main() -> None:
    p=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--test',action='store_true'); p.add_argument('--counts',action='store_true')
    p.add_argument('--demo',action='store_true'); p.add_argument('--N',type=int,default=4)
    p.add_argument('--L',type=int,default=5); p.add_argument('--output',type=Path,default=Path('heom_demo.csv'))
    a=p.parse_args()
    if a.N<1 or a.L<0: p.error('N must be >=1 and L must be >=0.')
    if a.test: run_tests()
    if a.counts:
        naive,canonical,unique=counts(a.N,a.L)
        print(f'N={a.N}, L={a.L}: conventional ADOs={naive}, canonical ADOs={canonical}, unique variables={unique}')
        print(f'One complex128 reduced vector: {16*unique/1e6:.6f} MB (not peak process memory).')
    if a.demo: demo(a.N,a.L,a.output)
    if not(a.test or a.counts or a.demo): p.print_help()

if __name__=='__main__':
    main()
