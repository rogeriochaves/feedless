//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Index: View {
    var body: some View {
        NavigationView {
            NavigationLink(destination: Login()) {
                Text("Login")
            }
            .navigationBarTitle(Text("Index"))
        }
    }
}

struct Index_Previews: PreviewProvider {
    static var previews: some View {
        Index()
    }
}

